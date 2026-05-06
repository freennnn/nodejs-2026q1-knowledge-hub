import { Injectable, OnModuleDestroy } from '@nestjs/common';

export type ConversationTurn = {
  userPrompt: string;
  assistantText: string;
};

type ConversationSession = {
  turns: ConversationTurn[];
  expiresAtMs: number;
};

const CONVERSATION_TURNS_LIMIT = 3;
const CONVERSATION_DEFAULT_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class AiConversationContextService implements OnModuleDestroy {
  private readonly sessions = new Map<string, ConversationSession>();
  private readonly pruneInterval: NodeJS.Timeout;

  constructor() {
    this.pruneInterval = setInterval(() => this.pruneExpired(), 60_000);
  }

  onModuleDestroy(): void {
    clearInterval(this.pruneInterval);
  }

  getRecentTurns(userId: string, sessionId: string): ConversationTurn[] {
    const key = this.buildKey(userId, sessionId);
    const session = this.sessions.get(key);
    if (!session) return [];
    if (session.expiresAtMs <= Date.now()) {
      this.sessions.delete(key);
      return [];
    }
    return [...session.turns];
  }

  appendTurn(userId: string, sessionId: string, turn: ConversationTurn): void {
    const key = this.buildKey(userId, sessionId);
    const existing = this.sessions.get(key);
    const turns = existing ? [...existing.turns, turn] : [turn];
    this.sessions.set(key, {
      turns: turns.slice(-CONVERSATION_TURNS_LIMIT),
      expiresAtMs: Date.now() + this.resolveTtlMs(),
    });
  }

  private buildKey(userId: string, sessionId: string): string {
    return `${userId}:${sessionId}`;
  }

  private resolveTtlMs(): number {
    const raw = Number(process.env.AI_CONTEXT_TTL_SEC);
    if (Number.isFinite(raw) && raw > 0) return raw * 1000;
    return CONVERSATION_DEFAULT_TTL_MS;
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [key, session] of this.sessions.entries()) {
      if (session.expiresAtMs <= now) {
        this.sessions.delete(key);
      }
    }
  }
}
