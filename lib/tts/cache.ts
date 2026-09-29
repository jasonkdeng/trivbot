import { createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { get, put } from "@vercel/blob";

const directory = join(process.cwd(), ".cache", "tts");
const blobPath = (voice: string, text: string) => `tts/${createHash("sha256").update(`${voice}:${text}`).digest("hex")}.mp3`;
const arrayBuffer = (audio: Buffer) => { const body = new ArrayBuffer(audio.byteLength); new Uint8Array(body).set(audio); return body; };

export async function cachedSpeech(voice: string, text: string, generate: () => Promise<Buffer>) {
  const key = blobPath(voice, text);
  const useBlob = process.env.TTS_CACHE_PROVIDER === "vercel-blob" || Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  if (useBlob) {
    const cached = await get(key, { access: "private" });
    if (cached?.stream) return Buffer.from(await new Response(cached.stream).arrayBuffer());
    const audio = await generate();
    await put(key, arrayBuffer(audio), { access: "private", addRandomSuffix: false, contentType: "audio/mpeg" });
    return audio;
  }
  if (process.env.NODE_ENV === "production") throw new Error("Persistent TTS caching is not configured.");
  const file = join(directory, key.replace("tts/", ""));
  try { return await readFile(file); } catch { /* cache miss */ }
  const audio = await generate(); await mkdir(directory, { recursive: true }); await writeFile(file, audio); return audio;
}
