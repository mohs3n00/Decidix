import { AppError } from '../utils/response.js';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ConversationSession {
  conversationId: string;
  userId?: string;
  messages: ConversationMessage[];
  createdAt: number;
  lastAccessedAt: number;
}

export class ConversationMemoryService {
  private static sessions = new Map<string, ConversationSession>();
  private static readonly MAX_TURNS = 3; // Keep up to 3 turns (6 messages)
  private static readonly MAX_MESSAGES = ConversationMemoryService.MAX_TURNS * 2;
  private static readonly TTL_MS = 2 * 60 * 60 * 1000; // 2 hours TTL
  private static readonly MAX_SESSIONS = 1000;

  /**
   * Generates a collision-resistant conversation ID.
   */
  static generateConversationId(): string {
    return `conv_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
  }

  /**
   * Retrieves an existing conversation session or creates a new one.
   * Enforces strict user isolation: if an existing conversation is owned by a different user,
   * access is denied.
   */
  static getOrCreateSession(conversationId?: string | null, userId?: string): {
    session: ConversationSession;
    isNew: boolean;
  } {
    this.evictExpiredSessions();

    if (conversationId && this.sessions.has(conversationId)) {
      const existing = this.sessions.get(conversationId)!;

      // Strict user isolation check
      if (existing.userId && userId && existing.userId !== userId) {
        throw AppError.forbidden(
          'Access denied to conversation history.',
          'CONVERSATION_ACCESS_DENIED'
        );
      }

      // If session had no owner, and user is now authenticated, claim ownership
      if (!existing.userId && userId) {
        existing.userId = userId;
      }

      existing.lastAccessedAt = Date.now();
      return { session: existing, isNew: false };
    }

    // Capacity limit enforcement
    if (this.sessions.size >= this.MAX_SESSIONS) {
      this.evictOldestSession();
    }

    const id = conversationId && conversationId.trim().length > 0
      ? conversationId.trim()
      : this.generateConversationId();

    const newSession: ConversationSession = {
      conversationId: id,
      userId,
      messages: [],
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
    };

    this.sessions.set(id, newSession);
    return { session: newSession, isNew: true };
  }

  /**
   * Records a user or assistant message to the bounded conversation history.
   */
  static recordMessage(
    conversationId: string,
    role: 'user' | 'assistant',
    content: string
  ): void {
    const session = this.sessions.get(conversationId);
    if (!session) return;

    session.messages.push({
      role,
      content,
      timestamp: Date.now(),
    });

    // Bound memory to MAX_MESSAGES (sliding window)
    if (session.messages.length > this.MAX_MESSAGES) {
      session.messages = session.messages.slice(-this.MAX_MESSAGES);
    }

    session.lastAccessedAt = Date.now();
  }

  /**
   * Retrieves recent messages formatted for LLM context injection.
   * Note: Prior assistant messages provide conversational continuity,
   * but are explicitly marked as non-authoritative in the system prompt.
   */
  static getRecentHistory(conversationId: string): Array<{ role: 'user' | 'assistant'; content: string }> {
    const session = this.sessions.get(conversationId);
    if (!session || session.messages.length === 0) {
      return [];
    }

    return session.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));
  }

  /**
   * Resets all conversation memory (for unit tests).
   */
  static clear(): void {
    this.sessions.clear();
  }

  /**
   * Returns current active session count.
   */
  static getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Evicts sessions that have exceeded the TTL.
   */
  private static evictExpiredSessions(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastAccessedAt > this.TTL_MS) {
        this.sessions.delete(id);
      }
    }
  }

  /**
   * Evicts the oldest session when capacity is reached.
   */
  private static evictOldestSession(): void {
    let oldestId: string | null = null;
    let oldestTime = Infinity;

    for (const [id, session] of this.sessions.entries()) {
      if (session.lastAccessedAt < oldestTime) {
        oldestTime = session.lastAccessedAt;
        oldestId = id;
      }
    }

    if (oldestId) {
      this.sessions.delete(oldestId);
    }
  }
}

