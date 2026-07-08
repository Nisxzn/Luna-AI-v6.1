import {
  Reranker as IReranker,
  RetrievalResult,
} from '@luna-ai/types';

export class Reranker implements IReranker {
  async rerank(results: RetrievalResult[], query: string): Promise<RetrievalResult[]> {
    const scoredResults = results.map((result) => ({
      result,
      score: this.calculateRelevanceScore(result.chunk.content, query, result.score),
    }));

    scoredResults.sort((a, b) => b.score - a.score);

    return scoredResults.map((item) => item.result);
  }

  private calculateRelevanceScore(content: string, query: string, vectorScore: number): number {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();

    const exactMatches = (contentLower.match(new RegExp(queryLower, 'g')) || []).length;
    const queryWords = queryLower.split(' ').filter((w) => w.length > 0);
    const wordMatches = queryWords.filter((word) => contentLower.includes(word)).length;

    const textScore = queryWords.length > 0 
      ? (exactMatches * 2 + wordMatches) / queryWords.length 
      : 0;

    const combinedScore = vectorScore * 0.7 + Math.min(textScore, 1) * 0.3;

    return combinedScore;
  }
}
