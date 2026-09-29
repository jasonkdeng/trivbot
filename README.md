# TriviaBot

Next.js player for hands-free Consensus trivia: question, think time, answer, repeat.

## Setup

1. Create/select a Google Cloud project and enable **Cloud Text-to-Speech API**.
2. Create Application Default Credentials suitable for your server (a local service-account JSON file is fine).
3. Copy `.env.example` to `.env.local`, configure the project, credential path, and optional voice.
4. Run `npm install`, then `npm run dev`.

Speech is generated only by `POST /api/tts`; credentials never reach the browser. MP3s are lazily cached in `.cache/tts/` by voice and text. The local `lib/trivia/packs.ts` source is normalized into the app’s `TriviaQuestion` shape and can be replaced with the real Consensus data source without altering playback.
