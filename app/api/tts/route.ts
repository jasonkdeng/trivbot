import { NextResponse } from "next/server";
import { cachedSpeech } from "../../../lib/tts/cache";
import { GoogleCloudTTSService } from "../../../lib/tts/google-cloud";
import { allowTts } from "../../../lib/tts/rate-limit";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (typeof text !== "string" || !text.trim() || text.length > 500) return NextResponse.json({ error: "Invalid speech text." }, { status: 400 });
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rate = await allowTts(ip);
    if (!rate) return NextResponse.json({ error: "TTS rate limiting is not configured." }, { status: 503 });
    if (!rate.success) {
      const retryAfter = Math.max(1, Math.ceil((rate.reset - Date.now()) / 1000));
      return NextResponse.json({ error: "Too many speech requests. Try again shortly." }, { status: 429, headers: { "Retry-After": String(retryAfter) } });
    }
    const voice = process.env.GOOGLE_TTS_VOICE || "en-US-Neural2-F";
    const audio = await cachedSpeech(voice, text.trim(), () => new GoogleCloudTTSService().generateSpeech(text.trim()));
    const body = new ArrayBuffer(audio.byteLength);
    new Uint8Array(body).set(audio);
    return new NextResponse(body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=31536000" } });
  } catch (error) {
    console.error("TTS failed", error); return NextResponse.json({ error: "Could not generate audio." }, { status: 502 });
  }
}
