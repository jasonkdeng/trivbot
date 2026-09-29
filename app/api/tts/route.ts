import { NextResponse } from "next/server";
import { cachedSpeech } from "../../../lib/tts/cache";
import { GoogleCloudTTSService } from "../../../lib/tts/google-cloud";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (typeof text !== "string" || !text.trim() || text.length > 500) return NextResponse.json({ error: "Invalid speech text." }, { status: 400 });
    const voice = process.env.GOOGLE_TTS_VOICE || "en-US-Neural2-F";
    const audio = await cachedSpeech(voice, text.trim(), () => new GoogleCloudTTSService().generateSpeech(text.trim()));
    const body = new ArrayBuffer(audio.byteLength);
    new Uint8Array(body).set(audio);
    return new NextResponse(body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=31536000" } });
  } catch (error) {
    console.error("TTS failed", error); return NextResponse.json({ error: "Could not generate audio." }, { status: 502 });
  }
}
