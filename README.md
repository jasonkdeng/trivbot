# TriviaBot

Next.js player for hands-free Consensus trivia: question, think time, answer, repeat.

## Setup

1. Create/select a Google Cloud project and enable **Cloud Text-to-Speech API**.
2. Create Application Default Credentials suitable for your server (a local service-account JSON file is fine).
3. Copy `.env.example` to `.env.local`, configure the project, credential path, and optional voice.
4. Run `npm install`, then `npm run dev`.

Speech is generated only by `POST /api/tts`; credentials never reach the browser. MP3s are lazily cached in `.cache/tts/` by voice and text. The local `lib/trivia/packs.ts` source is normalized into the app’s `TriviaQuestion` shape and can be replaced with the real Consensus data source without altering playback.

## Vercel production

Create a **private** Vercel Blob store and connect an Upstash Redis database from the Vercel Marketplace. Add their injected credentials, `TTS_CACHE_PROVIDER=vercel-blob`, `GOOGLE_TTS_LANGUAGE_CODE`, `GOOGLE_TTS_VOICE`, and the `GCP_*` Workload Identity Federation values in `.env.example` to Production and Preview environment variables. Set `GCP_AUDIENCE` to the Google provider's allowed audience, for example `https://vercel.com/YOUR_TEAM_SLUG`. Configure Vercel OIDC and Google Workload Identity Federation for a dedicated service account with the Cloud Text-to-Speech User role. Do not set `GOOGLE_APPLICATION_CREDENTIALS` or store a Google JSON key on Vercel.

Vercel uses Blob for cached MP3s and Redis for a 20-requests-per-minute-per-IP limit by default; set `TTS_RATE_LIMIT_PER_MINUTE` to change it. Deployments fail closed for TTS when Redis is missing.
