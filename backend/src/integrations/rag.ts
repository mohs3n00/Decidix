import {
  RagRepository,
  RetrievedDocument,
  RagSearchOptions,
  RagSearchResult,
  formatCitation,
} from '../repositories/rag.repository.js';

export { RetrievedDocument, RagSearchOptions, RagSearchResult, formatCitation };

export class RagService {
  /**
   * Retrieves relevant knowledge documents matching user query and optional filters via RagRepository.
   */
  static async search(
    query: string,
    options?: {
      regionId?: string | null;
      category?: string;
      minSimilarity?: number;
      limit?: number;
    }
  ): Promise<RetrievedDocument[]> {
    const result = await RagRepository.search({
      query,
      regionId: options?.regionId,
      category: options?.category,
      minSimilarity: options?.minSimilarity,
      limit: options?.limit ?? 3,
    });
    return result.documents;
  }

  /**
   * Formats retrieved context for LLM prompt ingestion with rigorous citations:
   * [Source: Document Name (Period)]
   */
  static formatContextForPrompt(docs: RetrievedDocument[], language: 'en' | 'ar'): string {
    if (docs.length === 0) {
      return 'No directly matching verified documents found in authoritative registry.';
    }
    return docs
      .map((d) => {
        const title = language === 'ar' ? d.arabicTitle : d.title;
        const text = language === 'ar' ? d.arabicContent : d.content;
        const citation = d.citation || formatCitation(title, d.period);
        return `${citation}\n${text}`;
      })
      .join('\n\n');
  }
}
