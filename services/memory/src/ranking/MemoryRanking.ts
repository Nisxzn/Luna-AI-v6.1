import { Memory, MemoryRankingScore, MemoryImportance } from '@luna-ai/types';

export class MemoryRanking {
  rankMemories(memories: Memory[], context?: string): MemoryRankingScore[] {
    const keywords = context ? this.extractKeywords(context) : [];

    return memories.map(memory => ({
      memoryId: memory.id,
      score: this.calculateOverallScore(memory, keywords),
      factors: {
        relevance: this.calculateRelevanceScore(memory, keywords),
        recency: this.calculateRecencyScore(memory),
        importance: this.calculateImportanceScore(memory),
        frequency: this.calculateFrequencyScore(memory),
      },
    }));
  }

  rankByRelevance(memories: Memory[], context: string): Memory[] {
    const ranked = this.rankMemories(memories, context);
    const scoreMap = new Map(ranked.map(r => [r.memoryId, r.score]));
    
    return memories
      .sort((a, b) => (scoreMap.get(b.id) || 0) - (scoreMap.get(a.id) || 0));
  }

  rankByRecency(memories: Memory[]): Memory[] {
    return [...memories].sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  rankByImportance(memories: Memory[]): Memory[] {
    const importanceOrder: Record<MemoryImportance, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    return [...memories].sort((a, b) => 
      importanceOrder[b.importance] - importanceOrder[a.importance]
    );
  }

  private calculateOverallScore(memory: Memory, keywords: string[]): number {
    const factors = {
      relevance: this.calculateRelevanceScore(memory, keywords),
      recency: this.calculateRecencyScore(memory),
      importance: this.calculateImportanceScore(memory),
      frequency: this.calculateFrequencyScore(memory),
    };

    return (
      factors.relevance * 0.4 +
      factors.recency * 0.2 +
      factors.importance * 0.3 +
      factors.frequency * 0.1
    );
  }

  private calculateRelevanceScore(memory: Memory, keywords: string[]): number {
    if (keywords.length === 0) return 0.5;

    const title = memory.title.toLowerCase();
    const content = memory.content.toLowerCase();
    const tags = memory.tags.map((tag: string) => tag.toLowerCase());

    let matches = 0;
    keywords.forEach((keyword: string) => {
      if (title.includes(keyword)) matches += 3;
      if (content.includes(keyword)) matches += 1;
      tags.forEach((tag: string) => {
        if (tag.includes(keyword)) matches += 2;
      });
    });

    const maxPossible = keywords.length * 6;
    return Math.min(matches / maxPossible, 1);
  }

  private calculateRecencyScore(memory: Memory): number {
    const daysSinceUpdate = (Date.now() - memory.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysSinceUpdate < 1) return 1;
    if (daysSinceUpdate < 7) return 0.8;
    if (daysSinceUpdate < 30) return 0.6;
    if (daysSinceUpdate < 90) return 0.4;
    if (daysSinceUpdate < 180) return 0.2;
    return 0.1;
  }

  private calculateImportanceScore(memory: Memory): number {
    const importanceScores: Record<MemoryImportance, number> = {
      critical: 1,
      high: 0.75,
      medium: 0.5,
      low: 0.25,
    };
    return importanceScores[memory.importance];
  }

  private calculateFrequencyScore(memory: Memory): number {
    const tagCount = memory.tags.length;
    return Math.min(tagCount / 5, 1);
  }

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while', 'although', 'though', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'this', 'that', 'these', 'those']);
    
    return words.filter((word: string) => word.length > 2 && !stopWords.has(word));
  }
}
