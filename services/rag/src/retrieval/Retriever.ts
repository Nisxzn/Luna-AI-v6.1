import {
  Retriever as IRetriever,
  RetrievalConfig,
  RetrievalResult,
  EmbeddingService,
  VectorStore,
} from '@luna-ai/types';

export class Retriever implements IRetriever {
  constructor(
    private embeddingService: EmbeddingService,
    private vectorStore: VectorStore
  ) {}

  async retrieve(query: string, config: RetrievalConfig): Promise<RetrievalResult[]> {
    const queryEmbedding = await this.embeddingService.embed(query);
    const results = await this.vectorStore.search(queryEmbedding, config);

    if (config.rerank) {
      return this.rerank(results, query);
    }

    return results;
  }

  private rerank(results: RetrievalResult[], query: string): RetrievalResult[] {
    return results.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a.chunk.content, query, a.score);
      const scoreB = this.calculateRelevanceScore(b.chunk.content, query, b.score);
      return scoreB - scoreA;
    });
  }

  private calculateRelevanceScore(content: string, query: string, vectorScore: number): number {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();

    const exactMatches = (contentLower.match(new RegExp(queryLower, 'g')) || []).length;
    const wordMatches = queryLower.split(' ').filter((word) => contentLower.includes(word)).length;

    const textScore = (exactMatches * 2 + wordMatches) / (queryLower.split(' ').length || 1);
    const combinedScore = vectorScore * 0.7 + textScore * 0.3;

    return combinedScore;
  }
}
