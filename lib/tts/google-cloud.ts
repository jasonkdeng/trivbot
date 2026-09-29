import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import type { TTSService } from "./service";

export class GoogleCloudTTSService implements TTSService {
  private client = new TextToSpeechClient();
  async generateSpeech(text: string) {
    const [response] = await this.client.synthesizeSpeech({ input: { text }, voice: { languageCode: process.env.GOOGLE_TTS_LANGUAGE_CODE || "en-US", name: process.env.GOOGLE_TTS_VOICE || "en-US-Neural2-F" }, audioConfig: { audioEncoding: "MP3" } });
    if (!response.audioContent) throw new Error("Google TTS returned no audio.");
    return Buffer.from(response.audioContent as Uint8Array);
  }
}
