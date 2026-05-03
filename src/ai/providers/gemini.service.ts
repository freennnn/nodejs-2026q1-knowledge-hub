import {
  BadGatewayException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { isAxiosError, type AxiosError } from 'axios';
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
        throw this.mapAxiosErrorToHttpException(error);
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
        this.extractTranslationJson(responseText),
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

  private mapAxiosErrorToHttpException(error: AxiosError): HttpException {
    if (error.code === 'ECONNABORTED') {
      return new ServiceUnavailableException('Gemini API request timed out');
    }

    if (!error.response) {
      const message =
        error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED'
          ? 'Gemini API is unreachable'
          : 'Gemini API network error';
      return new ServiceUnavailableException(message);
    }

    const status = error.response.status;
    const upstreamMessage = this.tryExtractGeminiErrorMessage(error.response.data);

    if (status === 429) {
      return new ServiceUnavailableException('Gemini API rate limit exceeded');
    }

    if (status >= 500) {
      return new BadGatewayException(upstreamMessage ?? 'Gemini API returned an error');
    }

    // 4xx from Gemini are usually request/config issues (bad model name, bad payload, bad key),
    // but from the client's perspective this is still "our upstream AI call failed".
    if (status >= 400) {
      return new BadGatewayException(upstreamMessage ?? 'Gemini API rejected the request');
    }

    return new BadGatewayException('Gemini API request failed');
  }

  private tryExtractGeminiErrorMessage(data: unknown): string | undefined {
    if (!data || typeof data !== 'object') return undefined;

    const root = data as Record<string, unknown>;
    const error = root['error'];
    if (!error || typeof error !== 'object') return undefined;

    const errorRecord = error as Record<string, unknown>;
    const message = errorRecord['message'];
    return typeof message === 'string' && message.trim().length > 0 ? message : undefined;
  }

  private extractTranslationJson(responseText: string): string {
    const withoutFences = this.stripMarkdownJsonFence(responseText);

    try {
      JSON.parse(withoutFences);
      return withoutFences;
    } catch {
      // fall through
    }

    const start = withoutFences.indexOf('{');
    const end = withoutFences.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('No JSON object found in model response');
    }

    return withoutFences.slice(start, end + 1);
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
