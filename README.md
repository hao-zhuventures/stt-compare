# STT Compare

A platform for comparing Speech-to-Text transcription results across six providers side-by-side: **Deepgram**, **AssemblyAI**, **OpenAI Whisper**, **Gladia**, **Speechmatics**, and **Google Cloud Speech-to-Text**.

Upload an audio file once and get back normalized transcripts, word-level confidence scores, speaker diarization, and processing time metrics from every provider simultaneously.

---

## Architecture

```
Browser / API client
       │
       ▼
POST /api/recordings          ← uploads file to Supabase Storage,
                                creates 6 transcription_jobs rows,
                                fires 6 Inngest events
       │
       ▼
Inngest (stt/job.requested)   ← one function invocation per provider,
                                runs concurrently (limit: 10)
       │
       ▼
Provider SDK / HTTP           ← calls Deepgram, AssemblyAI, OpenAI,
                                Gladia, Speechmatics, or Google
       │
       ▼
Normalizer                    ← converts raw response → Segment[]
       │
       ▼
Supabase (transcripts table)  ← stores segments + computed metrics
```

### Database tables

| Table | Purpose |
|---|---|
| `recordings` | Uploaded audio file metadata |
| `transcription_jobs` | One row per recording × provider; tracks status |
| `transcripts` | Normalized segments + metrics for each completed job |

---

## Prerequisites

- Node.js 18+
- pnpm (`npm install -g pnpm`)
- A [Supabase](https://supabase.com) project
- An [Inngest](https://inngest.com) account (free tier works)
- API keys for the providers you want to use

---

## Setup

### 1. Clone and install

```bash
git clone https://github.com/hao-zhuventures/stt-compare
cd stt-compare
pnpm install
```

### 2. Configure environment variables

Copy the example and fill in your values:

```bash
cp .env.example .env.local
```

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>

# Inngest
INNGEST_EVENT_KEY=<inngest-event-key>
INNGEST_SIGNING_KEY=<inngest-signing-key>

# STT providers (only set the ones you want to use)
DEEPGRAM_API_KEY=<deepgram-api-key>
ASSEMBLYAI_API_KEY=<assemblyai-api-key>
OPENAI_API_KEY=<openai-api-key>
GLADIA_API_KEY=<gladia-api-key>
SPEECHMATICS_API_KEY=<speechmatics-api-key>
# Google uses Application Default Credentials — see step 4 below
```

### 3. Set up Supabase

#### Database schema

Run the schema against your Supabase project. In the Supabase dashboard go to **SQL Editor** and paste the contents of `db/schema.sql`, then click **Run**.

Alternatively with the Supabase CLI:

```bash
supabase db push
```

#### Storage bucket

Create a public bucket named `audio`:

1. In the Supabase dashboard go to **Storage → New bucket**
2. Name it `audio`
3. Check **Public bucket** (needed so provider APIs can fetch the URL)
4. Click **Save**

Or via the CLI:

```bash
supabase storage create audio --public
```

### 4. Configure Google Cloud credentials (optional)

If you want to use the Google provider, set up Application Default Credentials:

```bash
gcloud auth application-default login
```

Or set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to a service account key file path.

### 5. Set up Inngest

#### Local development

Inngest provides a local dev server that receives events and runs your functions without needing a cloud account:

```bash
npx inngest-cli@latest dev
```

This starts the Inngest Dev Server at `http://localhost:8288`. Keep it running alongside `pnpm dev`.

#### Production

1. Sign up at [app.inngest.com](https://app.inngest.com)
2. Create an app and copy the **Event Key** and **Signing Key** into your environment variables
3. Deploy your Next.js app and register the serve URL (`https://your-domain.com/api/inngest`) in the Inngest dashboard under **Apps → Sync**

---

## Running locally

Start both the Next.js dev server and the Inngest dev server in separate terminals:

```bash
# Terminal 1 — Next.js
pnpm dev

# Terminal 2 — Inngest dev server
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

The app is available at `http://localhost:3000`.

---

## API Reference

### Upload a recording and trigger transcription

```http
POST /api/recordings
Content-Type: multipart/form-data

file: <audio file>
```

**Response `201`:**

```json
{
  "recording": {
    "id": "uuid",
    "filename": "interview.wav",
    "storage_path": "recordings/uuid-interview.wav",
    "created_at": "2026-03-17T00:00:00Z"
  },
  "jobs": [
    { "id": "uuid", "provider": "deepgram", "status": "pending", ... },
    { "id": "uuid", "provider": "assemblyai", "status": "pending", ... },
    ...
  ]
}
```

This immediately returns — transcription happens asynchronously via Inngest. Poll the jobs endpoint to check progress.

**Supported audio formats:** WAV, MP3, MP4, M4A, FLAC, OGG, WebM (provider support varies).

---

### Poll job status and results

```http
GET /api/recordings/:id/jobs
```

**Response `200`:**

```json
{
  "jobs": [
    {
      "id": "uuid",
      "provider": "deepgram",
      "status": "done",
      "completed_at": "2026-03-17T00:00:05Z",
      "transcripts": {
        "segments": [
          {
            "speaker": "Speaker 0",
            "speaker_id": 0,
            "language": "en",
            "words": [
              {
                "text": "hello",
                "start_timestamp": 0.0,
                "end_timestamp": 0.5,
                "confidence": 0.99,
                "language": "en"
              }
            ]
          }
        ],
        "metrics": {
          "wordCount": 42,
          "avgConfidence": 0.94,
          "languagesDetected": ["en"],
          "processingTimeMs": 3210
        }
      }
    },
    {
      "id": "uuid",
      "provider": "openai",
      "status": "running",
      ...
    }
  ]
}
```

Job `status` values:

| Status | Meaning |
|---|---|
| `pending` | Queued, not yet picked up |
| `running` | Provider API call in progress |
| `done` | Transcript saved |
| `error` | Failed — see `error_msg` field |

---

### Example: upload via curl

```bash
curl -X POST http://localhost:3000/api/recordings \
  -F "file=@/path/to/audio.wav"
```

Then poll with the returned recording ID:

```bash
curl http://localhost:3000/api/recordings/<recording-id>/jobs | jq
```

---

## Data model

### Segment

```typescript
{
  speaker: string        // "Speaker 0", "Speaker A", etc.
  speaker_id: number     // numeric index, 0-based
  language: string       // BCP-47 language code, e.g. "en"
  words: Word[]
}
```

### Word

```typescript
{
  text: string
  start_timestamp: number   // seconds from start of audio
  end_timestamp: number     // seconds from start of audio
  confidence: number        // 0.0–1.0
  language: string | null   // per-word language if provider supports it
}
```

### Metrics

```typescript
{
  wordCount: number
  avgConfidence: number       // mean confidence across all words
  languagesDetected: string[] // unique language codes found
  processingTimeMs: number    // wall-clock time of the provider API call
}
```

---

## Provider notes

| Provider | Diarization | Per-word language | Timestamps |
|---|---|---|---|
| Deepgram | ✓ (nova-2) | ✓ | seconds |
| AssemblyAI | ✓ | — | milliseconds (converted) |
| OpenAI Whisper | — (single speaker) | — | seconds |
| Gladia | ✓ | — | seconds |
| Speechmatics | ✓ | ✓ | seconds |
| Google | ✓ | — | seconds + nanos |

- **AssemblyAI** uses asynchronous polling internally; jobs may take 30–120 seconds for longer files.
- **Gladia** and **Speechmatics** also poll — the Inngest function handles this automatically with a 5-minute timeout.
- **OpenAI Whisper** does not perform speaker diarization; all words are assigned to `Speaker 0`.

---

## Development

### Run tests

```bash
pnpm test          # run once
pnpm test:watch    # watch mode
```

### Type check

```bash
pnpm exec tsc --noEmit
```

### Lint

```bash
pnpm lint
```
