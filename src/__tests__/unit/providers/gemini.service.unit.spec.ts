import { BadGatewayException, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { of, throwError } from 'rxjs';
import { GeminiService } from '@/ai/providers/gemini.service';

function buildAxiosError(status: number, message: string) {
  return {
    isAxiosError: true,
    response: {
      status,
      data: {
        error: { message },
      },
    },
  };
}

describe('GeminiService embedTexts', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.GEMINI_EMBEDDING_MODEL = 'gemini-embedding-001';
    process.env.GEMINI_EMBEDDING_DIMENSION = '768';
  });

  it('returns empty array for empty input without calling HTTP', async () => {
    const post = vi.fn();
    const httpService = { post } as unknown as HttpService;
    const service = new GeminiService(httpService);

    await expect(service.embedTexts([])).resolves.toEqual([]);
    expect(post).not.toHaveBeenCalled();
  });

  it('calls batchEmbedContents and returns vectors in order', async () => {
    const post = vi.fn(() =>
      of({
        data: {
          embeddings: [{ values: [0.1, 0.2] }, { values: [0.3, 0.4] }],
        },
      }),
    );
    const httpService = { post } as unknown as HttpService;
    const service = new GeminiService(httpService);

    const result = await service.embedTexts(['hello', 'world']);

    expect(result).toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
    expect(post).toHaveBeenCalledTimes(1);
    const firstCall = post.mock.calls[0] as unknown[] | undefined;
    expect(firstCall?.[0]).toContain('gemini-embedding-001:batchEmbedContents');
    expect(firstCall?.[1]).toEqual({
      requests: [
        {
          model: 'models/gemini-embedding-001',
          content: { parts: [{ text: 'hello' }] },
          outputDimensionality: 768,
        },
        {
          model: 'models/gemini-embedding-001',
          content: { parts: [{ text: 'world' }] },
          outputDimensionality: 768,
        },
      ],
    });
  });

  it('throws BadGatewayException when embeddings length mismatches', async () => {
    const post = vi.fn(() =>
      of({
        data: { embeddings: [{ values: [1] }] },
      }),
    );
    const httpService = { post } as unknown as HttpService;
    const service = new GeminiService(httpService);

    await expect(service.embedTexts(['a', 'b'])).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('chunks large inputs into multiple batchEmbedContents calls', async () => {
    let call = 0;
    const post = vi.fn(() => {
      call += 1;
      const n = call === 1 ? 100 : 1;
      return of({
        data: {
          embeddings: Array.from({ length: n }, () => ({ values: [0.1] })),
        },
      });
    });
    const httpService = { post } as unknown as HttpService;
    const service = new GeminiService(httpService);

    const texts = Array.from({ length: 101 }, (_, i) => `doc-${i}`);
    const result = await service.embedTexts(texts);

    expect(post).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(101);
  });
});

describe('GeminiService error mapping', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
  });

  it('maps upstream 401 to InternalServerErrorException with sanitized message', async () => {
    const upstreamMessage = 'Invalid API key: should not leak';
    const httpService = {
      post: vi.fn(() => throwError(() => buildAxiosError(401, upstreamMessage))),
    } as unknown as HttpService;
    const service = new GeminiService(httpService);

    await expect(service.translateText('hello', 'ukrainian')).rejects.toMatchObject({
      message: 'AI provider authentication failed',
    });

    await expect(service.translateText('hello', 'ukrainian')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('maps upstream 403 to InternalServerErrorException with sanitized message', async () => {
    const upstreamMessage = 'Permission denied for key abc123';
    const httpService = {
      post: vi.fn(() => throwError(() => buildAxiosError(403, upstreamMessage))),
    } as unknown as HttpService;
    const service = new GeminiService(httpService);

    try {
      await service.translateText('hello', 'ukrainian');
      throw new Error('Expected translateText to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(InternalServerErrorException);
      expect((error as Error).message).toBe('AI provider authentication failed');
      expect((error as Error).message).not.toContain(upstreamMessage);
    }
  });
});
