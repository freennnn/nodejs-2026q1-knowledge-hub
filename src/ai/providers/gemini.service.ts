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
import { buildAnalyzePrompt } from '../prompts/analyze.prompt';
import type { SummarizeMaxLength } from '../dto/summarize-max-length';
import type { AnalyzeArticleTask } from '../dto/analyze-article.dto';

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};

type TranslationResponse = {
  translatedText: string;
  detectedLanguage?: string;
};

type SummaryResponse = {
  summary: string;
};

type GenericPromptResult = {
  text: string;
};

type AnalyzeArticleResult = {
  analysis: string;
  suggestions: string[];
  severity: 'info' | 'warning' | 'error';
};

type GeminiUsageTokens = {
  prompt?: number;
  candidates?: number;
  total?: number;
};

type GeminiResult<T> = {
  data: T;
  usage?: GeminiUsageTokens;
};

/** Generic prompt flow: tight caps for cost and abuse resistance (defense in depth vs DTO). */
const GENERIC_PROMPT_MAX_USER_CHARS = 512;
const GENERIC_PROMPT_MAX_SYSTEM_CHARS = 512;
const GENERIC_PROMPT_MAX_OUTPUT_TOKENS = 512;
const GENERIC_PROMPT_MIN_OUTPUT_TOKENS = 16;
const GEMINI_429_MAX_RETRIES = 3;
const GEMINI_429_BASE_BACKOFF_MS = 500;
const GEMINI_429_MAX_JITTER_MS = 250;

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
  ): Promise<GeminiResult<TranslationResponse>> {
    const prompt = buildTranslatePrompt({ text, targetLanguage, sourceLanguage });

    try {
      const data = await this.postGenerateContent(prompt);
      return {
        data: this.parseTranslationResponse(data),
        usage: this.extractUsageMetadata(data),
      };
    } catch (error) {
      if (isAxiosError(error)) {
        throw this.mapAxiosErrorToHttpException(error);
      }
      throw error;
    }
  }

  async summarizeText(
    text: string,
    maxLength: SummarizeMaxLength,
    style?: string,
  ): Promise<GeminiResult<SummaryResponse>> {
    const prompt = buildSummarizePrompt({ text, maxLength, style });

    try {
      const data = await this.postGenerateContent(prompt);
      return {
        data: this.parseSummaryResponse(data),
        usage: this.extractUsageMetadata(data),
      };
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
  }): Promise<GeminiResult<GenericPromptResult>> {
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
      return {
        data: this.parseGenericPromptResponse(data),
        usage: this.extractUsageMetadata(data),
      };
    } catch (error) {
      if (isAxiosError(error)) {
        throw this.mapAxiosErrorToHttpException(error);
      }
      throw error;
    }
  }

  async analyzeArticleContent(
    text: string,
    task: AnalyzeArticleTask,
  ): Promise<GeminiResult<AnalyzeArticleResult>> {
    const prompt = buildAnalyzePrompt({ text, task });

    try {
      const data = await this.postGenerateContent(prompt);
      return {
        data: this.parseAnalyzeResponse(data),
        usage: this.extractUsageMetadata(data),
      };
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

    let attempt = 0;
    while (true) {
      try {
        const { data } = await firstValueFrom(
          this.httpService.post<GeminiGenerateContentResponse>(url, body, {
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': apiKey,
            },
          }),
        );

        return data;
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 429 && attempt < GEMINI_429_MAX_RETRIES) {
          const baseBackoffMs = GEMINI_429_BASE_BACKOFF_MS * 2 ** attempt;
          const jitterMs = Math.floor(Math.random() * GEMINI_429_MAX_JITTER_MS);
          await this.sleep(baseBackoffMs + jitterMs);
          attempt += 1;
          continue;
        }
        throw error;
      }
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

      return {
        summary: parsed.summary.trim(),
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

  private parseAnalyzeResponse(data: GeminiGenerateContentResponse): AnalyzeArticleResult {
    const responseText = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter((part): part is string => Boolean(part))
      .join('')
      .trim();

    if (!responseText) {
      throw new BadGatewayException('Gemini API returned an empty response');
    }

    try {
      const parsed = JSON.parse(this.extractJsonObjectFromModelText(responseText)) as {
        analysis?: unknown;
        suggestions?: unknown;
        severity?: unknown;
      };

      if (typeof parsed.analysis !== 'string' || !parsed.analysis.trim()) {
        throw new Error('analysis is missing');
      }

      if (!Array.isArray(parsed.suggestions) || parsed.suggestions.some((item) => typeof item !== 'string')) {
        throw new Error('suggestions must be string[]');
      }

      if (parsed.severity !== 'info' && parsed.severity !== 'warning' && parsed.severity !== 'error') {
        throw new Error('severity must be info|warning|error');
      }

      return {
        analysis: parsed.analysis.trim(),
        suggestions: parsed.suggestions.map((item) => item.trim()).filter((item) => item.length > 0),
        severity: parsed.severity,
      };
    } catch {
      throw new BadGatewayException('Gemini API returned invalid analyze JSON');
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

    if (status === 401 || status === 403 || this.isLikelyApiKeyFailure(upstreamMessage)) {
      return new InternalServerErrorException('AI provider authentication failed');
    }

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

  private extractUsageMetadata(data: GeminiGenerateContentResponse): GeminiUsageTokens | undefined {
    const usage = data.usageMetadata;
    if (!usage) return undefined;

    const prompt = typeof usage.promptTokenCount === 'number' ? usage.promptTokenCount : undefined;
    const candidates =
      typeof usage.candidatesTokenCount === 'number' ? usage.candidatesTokenCount : undefined;
    const total = typeof usage.totalTokenCount === 'number' ? usage.totalTokenCount : undefined;

    if (prompt === undefined && candidates === undefined && total === undefined) {
      return undefined;
    }
    return { prompt, candidates, total };
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

  private isLikelyApiKeyFailure(message: string | undefined): boolean {
    if (!message) return false;
    return /(api key|invalid key|authentication failed|unauthenticated|permission denied)/i.test(message);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
