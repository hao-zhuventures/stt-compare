import type { ProviderName, Segment } from '@/types'
import { normalizeDeepgram } from './deepgram'
import { normalizeAssemblyAI } from './assemblyai'
import { normalizeOpenAI } from './openai'
import { normalizeGladia } from './gladia'
import { normalizeSpeechmatics } from './speechmatics'

export async function transcribe(provider: ProviderName, audioUrl: string): Promise<Segment[]> {
  switch (provider) {
    case 'deepgram': {
      const { createClient } = await import('@deepgram/sdk')
      const dg = createClient(process.env.DEEPGRAM_API_KEY!)
      const { result } = await dg.listen.prerecorded.transcribeUrl(
        { url: audioUrl },
        { model: 'nova-2', diarize: true, language: 'multi' }
      )
      return normalizeDeepgram(result as Parameters<typeof normalizeDeepgram>[0])
    }

    case 'assemblyai': {
      const { AssemblyAI } = await import('assemblyai')
      const client = new AssemblyAI({ apiKey: process.env.ASSEMBLYAI_API_KEY! })
      const transcript = await client.transcripts.transcribe({
        audio_url: audioUrl,
        speaker_labels: true,
      })
      return normalizeAssemblyAI(transcript as Parameters<typeof normalizeAssemblyAI>[0])
    }

    case 'openai': {
      const OpenAI = (await import('openai')).default
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
      const response = await fetch(audioUrl)
      const blob = await response.blob()
      const file = new File([blob], 'audio.wav', { type: 'audio/wav' })
      const result = await client.audio.transcriptions.create({
        model: 'whisper-1',
        file,
        response_format: 'verbose_json',
        timestamp_granularities: ['word', 'segment'],
      })
      return normalizeOpenAI(result as unknown as Parameters<typeof normalizeOpenAI>[0])
    }

    case 'gladia': {
      const response = await fetch('https://api.gladia.io/v2/pre-recorded', {
        method: 'POST',
        headers: {
          'x-gladia-key': process.env.GLADIA_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ audio_url: audioUrl, diarization: true }),
      })
      const { id } = await response.json()
      // Poll for result
      const result = await pollGladia(id)
      return normalizeGladia(result)
    }

    case 'speechmatics': {
      const FormData = (await import('node:stream')).PassThrough
      const audioRes = await fetch(audioUrl)
      const audioBuffer = Buffer.from(await audioRes.arrayBuffer())
      const formData = new globalThis.FormData()
      formData.append('config', JSON.stringify({ type: 'transcription', transcription_config: { operating_point: 'enhanced', enable_entities: true, diarization: 'speaker' } }))
      formData.append('audio', new Blob([audioBuffer]), 'audio.wav')
      const jobRes = await fetch('https://asr.api.speechmatics.com/v2/jobs/', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.SPEECHMATICS_API_KEY!}` },
        body: formData,
      })
      const { id } = await jobRes.json()
      const transcript = await pollSpeechmatics(id)
      return normalizeSpeechmatics(transcript)
    }

    case 'google': {
      const { SpeechClient } = await import('@google-cloud/speech')
      const client = new SpeechClient()
      const audioRes = await fetch(audioUrl)
      const audioBuffer = Buffer.from(await audioRes.arrayBuffer())
      const [response] = (await client.recognize({
        audio: { content: audioBuffer.toString('base64') },
        config: {
          encoding: 'LINEAR16' as const,
          enableWordTimeOffsets: true,
          enableWordConfidence: true,
          diarizationConfig: { enableSpeakerDiarization: true },
          model: 'latest_long',
        },
      })) as unknown as [Parameters<typeof normalizeGoogle>[0]]
      return normalizeGoogle(response)
    }

    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}

async function pollGladia(id: string, maxWaitMs = 300_000): Promise<Parameters<typeof normalizeGladia>[0]> {
  const deadline = Date.now() + maxWaitMs
  while (Date.now() < deadline) {
    const res = await fetch(`https://api.gladia.io/v2/pre-recorded/${id}`, {
      headers: { 'x-gladia-key': process.env.GLADIA_API_KEY! },
    })
    const data = await res.json()
    if (data.status === 'done') return data
    if (data.status === 'error') throw new Error(`Gladia error: ${data.error_code}`)
    await sleep(3000)
  }
  throw new Error('Gladia polling timed out')
}

async function pollSpeechmatics(id: string, maxWaitMs = 300_000): Promise<Parameters<typeof normalizeSpeechmatics>[0]> {
  const deadline = Date.now() + maxWaitMs
  while (Date.now() < deadline) {
    const res = await fetch(`https://asr.api.speechmatics.com/v2/jobs/${id}/transcript`, {
      headers: { Authorization: `Bearer ${process.env.SPEECHMATICS_API_KEY!}` },
    })
    if (res.status === 200) return res.json()
    await sleep(3000)
  }
  throw new Error('Speechmatics polling timed out')
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

// Google Speech-to-Text has a unique response shape — inline normalizer
function normalizeGoogle(response: {
  results?: Array<{
    alternatives?: Array<{
      words?: Array<{
        word?: string | null
        startTime?: { seconds?: string | number | null; nanos?: number | null } | null
        endTime?: { seconds?: string | number | null; nanos?: number | null } | null
        confidence?: number | null
        speakerTag?: number | null
      }>
    }>
  }>
}): Segment[] {
  const allWords = (response.results ?? [])
    .flatMap((r) => r.alternatives?.[0]?.words ?? [])

  if (allWords.length === 0) return []

  const segments: Segment[] = []
  let currentSpeaker = allWords[0].speakerTag ?? 0
  let currentWords: Segment['words'] = []

  for (const w of allWords) {
    const speakerId = w.speakerTag ?? 0
    if (speakerId !== currentSpeaker && currentWords.length > 0) {
      segments.push({ speaker: `Speaker ${currentSpeaker}`, speaker_id: currentSpeaker, language: '', words: currentWords })
      currentSpeaker = speakerId
      currentWords = []
    }
    const startS = Number(w.startTime?.seconds ?? 0) + (w.startTime?.nanos ?? 0) / 1e9
    const endS = Number(w.endTime?.seconds ?? 0) + (w.endTime?.nanos ?? 0) / 1e9
    currentWords.push({
      text: w.word ?? '',
      start_timestamp: startS,
      end_timestamp: endS,
      confidence: w.confidence ?? 0,
      language: null,
    })
  }

  if (currentWords.length > 0) {
    segments.push({ speaker: `Speaker ${currentSpeaker}`, speaker_id: currentSpeaker, language: '', words: currentWords })
  }

  return segments
}
