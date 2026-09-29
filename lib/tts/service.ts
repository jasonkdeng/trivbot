export interface TTSService { generateSpeech(text: string): Promise<Buffer>; }
