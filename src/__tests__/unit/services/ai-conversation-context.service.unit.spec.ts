import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AiConversationContextService } from '@/ai/cache/ai-conversation-context.service';

describe('AiConversationContextService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.AI_CONTEXT_TTL_SEC;
  });

  it('keeps only the last 3 turns per session', () => {
    const service = new AiConversationContextService();
    const userId = 'u-1';
    const sessionId = 's-1';

    service.appendTurn(userId, sessionId, { userPrompt: 'p1', assistantText: 'a1' });
    service.appendTurn(userId, sessionId, { userPrompt: 'p2', assistantText: 'a2' });
    service.appendTurn(userId, sessionId, { userPrompt: 'p3', assistantText: 'a3' });
    service.appendTurn(userId, sessionId, { userPrompt: 'p4', assistantText: 'a4' });

    expect(service.getRecentTurns(userId, sessionId)).toEqual([
      { userPrompt: 'p2', assistantText: 'a2' },
      { userPrompt: 'p3', assistantText: 'a3' },
      { userPrompt: 'p4', assistantText: 'a4' },
    ]);
  });

  it('expires sessions by TTL', () => {
    process.env.AI_CONTEXT_TTL_SEC = '1';
    const nowSpy = vi.spyOn(Date, 'now');
    nowSpy.mockReturnValue(1_000);

    const service = new AiConversationContextService();
    const userId = 'u-1';
    const sessionId = 's-1';

    service.appendTurn(userId, sessionId, { userPrompt: 'prompt', assistantText: 'answer' });

    nowSpy.mockReturnValue(2_001);
    expect(service.getRecentTurns(userId, sessionId)).toEqual([]);
  });
});
