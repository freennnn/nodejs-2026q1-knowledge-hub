import { BadGatewayException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { buildTranslatePrompt } from '../prompts/translate.prompt';

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

type TranslationResponse = {
  translatedText: string;
  detectedLanguage?: string;
};

@Injectable()
export class GeminiService {
  private readonly apiBaseUrl =
    process.env.GEMINI_API_BASE_URL ?? 'https://generativelanguage.googleapis.com';
  private readonly model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash';

  constructor(private readonly httpService: HttpService) {}

  async translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage?: string,
  ): Promise<TranslationResponse> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException('Gemini API key is not configured');
    }

    const url = `${this.apiBaseUrl}/v1beta/models/${this.model}:generateContent`;
    const prompt = buildTranslatePrompt({ text, targetLanguage, sourceLanguage });

    try {
      const { data } = await firstValueFrom(
        this.httpService.post<GeminiGenerateContentResponse>(
          url,
          {
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }],
              },
            ],
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
          },
        ),
      );

      return this.parseTranslationResponse(data);
    } catch (error) {
      if (isAxiosError(error)) {
        throw new BadGatewayException('Gemini API request failed');
      }
      throw error;
    }
  }

  private parseTranslationResponse(data: GeminiGenerateContentResponse): TranslationResponse {
    const responseText = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter((part): part is string => Boolean(part))
      .join('')
      .trim();

    if (!responseText) {
      throw new BadGatewayException('Gemini API returned an empty response');
    }

    try {
      const parsed = JSON.parse(
        this.stripMarkdownJsonFence(responseText),
      ) as Partial<TranslationResponse>;
      if (typeof parsed.translatedText !== 'string') {
        throw new Error('translatedText is missing');
      }

      return {
        translatedText: parsed.translatedText,
        detectedLanguage:
          typeof parsed.detectedLanguage === 'string' ? parsed.detectedLanguage : undefined,
      };
    } catch {
      throw new BadGatewayException('Gemini API returned invalid translation JSON');
    }
  }

  // removing potential ```json or ``` from llm response
  private stripMarkdownJsonFence(text: string): string {
    return text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
  }
}
