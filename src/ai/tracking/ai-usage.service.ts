import { Injectable } from '@nestjs/common';

type AiUsageTokens = {
  prompt?: number;
  candidates?: number;
  total?: number;
};

type AiUsageSnapshot = {
  totalRequests: number;
  byEndpoint: Record<string, number>;
  tokenTotals: {
    prompt: number;
    candidates: number;
    total: number;
  };
};

@Injectable()
export class AiUsageService {
  private totalRequests = 0;
  private readonly byEndpoint = new Map<string, number>();
  private tokenTotals = {
    prompt: 0,
    candidates: 0,
    total: 0,
  };

  record(endpoint: string): void {
    this.totalRequests += 1;
    this.byEndpoint.set(endpoint, (this.byEndpoint.get(endpoint) ?? 0) + 1);
  }

  recordTokens(tokens?: AiUsageTokens): void {
    if (!tokens) return;
    const prompt = tokens.prompt ?? 0;
    const candidates = tokens.candidates ?? 0;

    this.tokenTotals.prompt += prompt;
    this.tokenTotals.candidates += candidates;
    // Keep "total" consistent with displayed prompt+candidates counters.
    this.tokenTotals.total += prompt + candidates;
  }

  getSnapshot(): AiUsageSnapshot {
    return {
      totalRequests: this.totalRequests,
      byEndpoint: Object.fromEntries(this.byEndpoint),
      tokenTotals: { ...this.tokenTotals },
    };
  }
}
