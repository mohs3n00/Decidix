import { AppError } from '../utils/response.js';
import { env } from '../config/env.js';
import { RagRepository, RetrievedDocument } from '../repositories/rag.repository.js';
import { OpenRouterService, AssistantChatResult } from '../integrations/openrouter.js';
import { ConversationMemoryService } from './conversation_memory.service.js';

export interface AssistantChatParams {
  message: string;
  language?: 'en' | 'ar';
  conversationId?: string | null;
  userId?: string;
  minSimilarity?: number;
}

export interface AssistantChatResponse {
  conversation_id: string;
  reply: {
    text: string;
    table?: {
      rows: Array<{
        region_id: string;
        name: string;
        arabic_name: string;
        score: number;
        change: number;
      }>;
    } | null;
    sources: Array<{
      name: string;
      arabic_name: string;
      period: string;
    }>;
  };
  suggested_prompts: string[];
}

export class AiAssistantService {
  /**
   * Orchestrates the complete end-to-end AI Assistant lifecycle:
   * 1. Input validation & sanitization
   * 2. Conversation session resolution & access control
   * 3. Grounded evidence retrieval from RagRepository
   * 4. Evidence sufficiency & refusal check
   * 5. Anti-injection prompt assembly & Free LLM gateway execution
   * 6. Conversational memory preservation
   */
  static async chat(params: AssistantChatParams): Promise<AssistantChatResponse> {
    const rawMessage = params.message;

    // 1. Input Validation and Normalization
    if (!rawMessage || typeof rawMessage !== 'string' || rawMessage.trim().length === 0) {
      throw AppError.badRequest('Message is required and cannot be empty.', 'EMPTY_MESSAGE');
    }

    const trimmedMessage = rawMessage.trim();
    if (trimmedMessage.length > 1000) {
      throw AppError.badRequest('Message length cannot exceed 1000 characters.', 'MESSAGE_TOO_LONG');
    }

    const isArabic = params.language === 'ar' || /[\u0600-\u06FF]/.test(trimmedMessage);
    const language: 'en' | 'ar' = isArabic ? 'ar' : (params.language || 'en');

    // 2. Resolve Conversation Session & User Isolation
    const { session } = ConversationMemoryService.getOrCreateSession(
      params.conversationId,
      params.userId
    );

    const history = ConversationMemoryService.getRecentHistory(session.conversationId);

    // 3. Grounded Evidence Retrieval via RagRepository
    const minSim = params.minSimilarity ?? env.RAG_SIMILARITY_THRESHOLD ?? 0.65;
    const searchResult = await RagRepository.search({
      query: trimmedMessage,
      minSimilarity: minSim,
      limit: 3,
    });

    const retrievedDocs: RetrievedDocument[] = searchResult.documents;

    // 4. Generate Grounded or Refusal Response
    const result: AssistantChatResult = await OpenRouterService.generateAnswer({
      message: trimmedMessage,
      language,
      retrievedDocs,
      conversationHistory: history,
    });

    // 5. Update Bounded Conversational Memory
    ConversationMemoryService.recordMessage(session.conversationId, 'user', trimmedMessage);
    ConversationMemoryService.recordMessage(session.conversationId, 'assistant', result.reply.text);

    // 6. Return standard Contract-compliant response
    return {
      conversation_id: session.conversationId,
      reply: result.reply,
      suggested_prompts: result.suggested_prompts,
    };
  }
}

