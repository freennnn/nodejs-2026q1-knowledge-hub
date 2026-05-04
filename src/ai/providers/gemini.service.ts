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
import { buildSummarizePrompt } from '../prompts/summarize.prompt';
import { buildGenericPrompt } from '../prompts/generic-prompt.prompt';

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

type SummaryResponse = {
  summary: string;
  wordCount: number;
};

type GenericPromptResult = {
  text: string;
};

/** Generic prompt flow: tight caps for cost and abuse resistance (defense in depth vs DTO). */
const GENERIC_PROMPT_MAX_USER_CHARS = 512;
const GENERIC_PROMPT_MAX_SYSTEM_CHARS = 512;
const GENERIC_PROMPT_MAX_OUTPUT_TOKENS = 512;
const GENERIC_PROMPT_MIN_OUTPUT_TOKENS = 16;

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
    const prompt = buildTranslatePrompt({ text, targetLanguage, sourceLanguage });

    try {
      const data = await this.postGenerateContent(prompt);
      return this.parseTranslationResponse(data);
    } catch (error) {
      if (isAxiosError(error)) {
        throw this.mapAxiosErrorToHttpException(error);
      }
      throw error;
    }
  }

  async summarizeText(text: string, maxWords?: number, style?: string): Promise<SummaryResponse> {
    const prompt = buildSummarizePrompt({ text, maxWords, style });

    try {
      const data = await this.postGenerateContent(prompt);
      return this.parseSummaryResponse(data);
    } catch (error) {
      if (isAxiosError(error)) {
        throw this.mapAxiosErrorToHttpException(error);
      }
      throw error;
    }
  }

  async completeGenericPrompt(options: {
    userPrompt: string;
    systemInstruction?: string;
    maxOutputTokens?: number;
    temperature?: number;
  }): Promise<GenericPromptResult> {
    const userPrompt = this.truncateGenericPromptText(options.userPrompt, GENERIC_PROMPT_MAX_USER_CHARS);
    const systemInstruction = options.systemInstruction
      ? this.truncateGenericPromptText(options.systemInstruction, GENERIC_PROMPT_MAX_SYSTEM_CHARS)
      : undefined;

    const maxOutputTokens = this.clampGenericPromptMaxOutputTokens(options.maxOutputTokens);

    const prompt = buildGenericPrompt({
      userPrompt,
      systemInstruction,
      maxOutputTokens,
      temperature: options.temperature,
    });

    const generationConfig: Record<string, unknown> = {
      maxOutputTokens,
    };
    if (options.temperature !== undefined) {
      generationConfig.temperature = options.temperature;
    }

    try {
      const data = await this.postGenerateContent(prompt, generationConfig);
      return this.parseGenericPromptResponse(data);
    } catch (error) {
      if (isAxiosError(error)) {
        throw this.mapAxiosErrorToHttpException(error);
      }
      throw error;
    }
  }

  /** Prefer code-point boundaries over raw UTF-16 slice for trimmed user/system text. */
  private truncateGenericPromptText(value: string, maxChars: number): string {
    if (value.length <= maxChars) {
      return value;
    }
    return Array.from(value).slice(0, maxChars).join('');
  }

  private clampGenericPromptMaxOutputTokens(requested: number | undefined): number {
    const fallback = GENERIC_PROMPT_MAX_OUTPUT_TOKENS;
    const n = requested !== undefined ? requested : fallback;
    return Math.min(GENERIC_PROMPT_MAX_OUTPUT_TOKENS, Math.max(GENERIC_PROMPT_MIN_OUTPUT_TOKENS, n));
  }

  private requireApiKey(): string {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new InternalServerErrorException('Gemini API key is not configured');
    }
    return apiKey;
  }

  private async postGenerateContent(
    prompt: string,
    generationConfig?: Record<string, unknown>,
  ): Promise<GeminiGenerateContentResponse> {
    const apiKey = this.requireApiKey();
    const url = `${this.apiBaseUrl}/v1beta/models/${this.model}:generateContent`;

    const body: Record<string, unknown> = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
    };

    if (generationConfig && Object.keys(generationConfig).length > 0) {
      body.generationConfig = generationConfig;
    }

    const { data } = await firstValueFrom(
      this.httpService.post<GeminiGenerateContentResponse>(url, body, {
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
      }),
    );

    return data;
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
      const parsed = JSON.parse(this.extractJsonObjectFromModelText(responseText)) as Partial<TranslationResponse>;
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

  private parseSummaryResponse(data: GeminiGenerateContentResponse): SummaryResponse {
    const responseText = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter((part): part is string => Boolean(part))
      .join('')
      .trim();

    if (!responseText) {
      throw new BadGatewayException('Gemini API returned an empty response');
    }

    try {
      const parsed = JSON.parse(this.extractJsonObjectFromModelText(responseText)) as Partial<SummaryResponse>;
      if (typeof parsed.summary !== 'string' || !parsed.summary.trim()) {
        throw new Error('summary is missing');
      }
      if (typeof parsed.wordCount !== 'number' || !Number.isFinite(parsed.wordCount)) {
        throw new Error('wordCount is missing or invalid');
      }
      if (!Number.isInteger(parsed.wordCount)) {
        throw new Error('wordCount must be an integer');
      }

      return {
        summary: parsed.summary.trim(),
        wordCount: parsed.wordCount,
      };
    } catch {
      throw new BadGatewayException('Gemini API returned invalid summary JSON');
    }
  }

  private parseGenericPromptResponse(data: GeminiGenerateContentResponse): GenericPromptResult {
    const responseText = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter((part): part is string => Boolean(part))
      .join('')
      .trim();

    if (!responseText) {
      throw new BadGatewayException('Gemini API returned an empty response');
    }

    try {
      const parsed = JSON.parse(this.extractJsonObjectFromModelText(responseText)) as Partial<GenericPromptResult>;
      if (typeof parsed.text !== 'string' || !parsed.text.trim()) {
        throw new Error('text is missing');
      }

      return {
        text: parsed.text.trim(),
      };
    } catch {
      throw new BadGatewayException('Gemini API returned invalid generic prompt JSON');
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

  private extractJsonObjectFromModelText(responseText: string): string {
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
