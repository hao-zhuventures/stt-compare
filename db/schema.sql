create extension if not exists "pgcrypto";

create table recordings (
  id           uuid        primary key default gen_random_uuid(),
  filename     text        not null,
  storage_path text,
  duration_s   float,
  created_at   timestamptz not null default now()
);

create table transcription_jobs (
  id           uuid        primary key default gen_random_uuid(),
  recording_id uuid        not null references recordings(id) on delete cascade,
  provider     text        not null check (provider in (
                             'deepgram','gladia','assemblyai','speechmatics','google','openai')),
  status       text        not null default 'pending' check (status in (
                             'pending','running','done','error')),
  error_msg    text,
  created_at   timestamptz not null default now(),
  completed_at timestamptz,
  -- unique constraint enables upsert on retry
  unique(recording_id, provider)
);

create table transcripts (
  id         uuid        primary key default gen_random_uuid(),
  job_id     uuid        not null references transcription_jobs(id) on delete cascade unique,
  segments   jsonb       not null,
  metrics    jsonb       not null,
  created_at timestamptz not null default now()
);

create index transcription_jobs_recording_id_idx on transcription_jobs(recording_id);
