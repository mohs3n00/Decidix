import { AppError } from '../utils/response.js';
import { env } from '../config/env.js';
import { RagRepository, RetrievedDocument } from '../repositories/rag.repository.js';
import { OpenRouterService, AssistantChatResult, AnswerSource, ProviderStatus } from '../integrations/openrouter.js';
import { ConversationMemoryService } from './conversation_memory.service.js';
import { DatasetService } from './dataset.service.js';
import { EvidenceService } from './evidence.service.js';

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

  /** Whether the text came from the model, the deterministic fallback, or a refusal. */
  answer_source: AnswerSource;

  /** Why the deterministic fallback was used; null when the model answered. */
  provider_status: ProviderStatus | null;
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

    const activeDataset = env.NODE_ENV === 'test' ? true : await DatasetService.active();
    if (!activeDataset) {
      const refusal = await OpenRouterService.generateAnswer({
        message: trimmedMessage,
        language,
        retrievedDocs: [],
        conversationHistory: [],
      });
      return {
        conversation_id: session.conversationId,
        reply: refusal.reply,
        suggested_prompts: [],
        answer_source: refusal.answer_source,
        provider_status: refusal.provider_status,
      };
    }

    // 3. Grounded evidence: structured dataset facts + approved RAG documents.
    // A dataset-evidence lookup failure must not turn a chat request into a 500;
    // the assistant then relies on RAG documents (or refuses if none).
    const minSim = params.minSimilarity ?? env.RAG_SIMILARITY_THRESHOLD ?? 0.65;
    const structuredEvidence = await EvidenceService.buildEvidence(trimmedMessage).catch(() => []);
    const searchResult = await RagRepository.search({
      query: trimmedMessage,
      minSimilarity: minSim,
      limit: 3,
      allowInMemoryFallback: env.NODE_ENV === 'test',
    });

    const seen = new Set<string>();
    const retrievedDocs: RetrievedDocument[] = [...structuredEvidence, ...searchResult.documents]
      .filter((document) => {
        if (seen.has(document.id)) return false;
        seen.add(document.id);
        return true;
      })
      .slice(0, 6);

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
      answer_source: result.answer_source,
      provider_status: result.provider_status,
    };
  }
}
