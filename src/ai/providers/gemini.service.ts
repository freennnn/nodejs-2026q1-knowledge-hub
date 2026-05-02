import { Injectable } from '@nestjs/common';
@Injectable()
export class GeminiService {
  async translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string,
  ): Promise<{ translatedText: string; detectedLanguage?: string }> {
    return { translatedText: 'Viva la vida', detectedLanguage: undefined };
  }
}
