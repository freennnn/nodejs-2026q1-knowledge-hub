import { InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { throwError } from 'rxjs';
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
