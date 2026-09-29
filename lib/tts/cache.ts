import { createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

const directory = join(process.cwd(), ".cache", "tts");
export async function cachedSpeech(voice: string, text: string, generate: () => Promise<Buffer>) {
  const file = join(directory, `${createHash("sha256").update(`${voice}:${text}`).digest("hex")}.mp3`);
  try { return await readFile(file); } catch { /* cache miss */ }
  const audio = await generate(); await mkdir(directory, { recursive: true }); await writeFile(file, audio); return audio;
}
