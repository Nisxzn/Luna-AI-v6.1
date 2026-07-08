import { Memory, MemorySummary } from '@luna-ai/types';
import { v4 as uuidv4 } from 'uuid';

export class MemorySummarizer {
  summarizeConversation(memories: Memory[], maxWords = 200): MemorySummary {
    if (memories.length === 0) {
      throw new Error('No memories to summarize');
    }

    const allContent = memories.map(m => m.content).join('\n');
    const summary = this.generateSummary(allContent, maxWords);

    return {
      id: uuidv4(),
      originalMemoryIds: memories.map(m => m.id),
      summary,
      createdAt: new Date(),
      wordCount: summary.split(/\s+/).length,
    };
  }

  summarizeProject(memories: Memory[], maxWords = 300): MemorySummary {
    const projectMemories = memories.filter(m => m.category === 'project');
    return this.summarizeConversation(projectMemories, maxWords);
  }

  summarizeByTopic(memories: Memory[], topic: string, maxWords = 150): MemorySummary {
    const relevantMemories = memories.filter(m => 
      m.title.toLowerCase().includes(topic.toLowerCase()) ||
      m.content.toLowerCase().includes(topic.toLowerCase()) ||
      m.tags.some((tag: string) => tag.toLowerCase().includes(topic.toLowerCase()))
    );

    return this.summarizeConversation(relevantMemories, maxWords);
  }

  private generateSummary(content: string, maxWords: number): string {
    const sentences = content.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
    
    if (sentences.length <= 3) {
      return this.truncateToWords(content, maxWords);
    }

    const importantSentences = this.selectImportantSentences(sentences, Math.min(sentences.length, 5));
    const summary = importantSentences.join('. ');
    
    return this.truncateToWords(summary, maxWords);
  }

  private selectImportantSentences(sentences: string[], count: number): string[] {
    const scored = sentences.map((sentence: string) => ({
      sentence,
      score: this.calculateSentenceScore(sentence),
    }));

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, count).map(item => item.sentence.trim());
  }

  private calculateSentenceScore(sentence: string): number {
    let score = 0;
    const words = sentence.toLowerCase().split(/\s+/);

    const importantWords = ['important', 'critical', 'key', 'main', 'primary', 'essential', 'crucial', 'significant', 'major', 'fundamental'];
    const actionWords = ['should', 'must', 'need', 'require', 'implement', 'create', 'build', 'develop', 'fix', 'resolve', 'solve'];
    
    words.forEach((word: string) => {
      if (importantWords.includes(word)) score += 2;
      if (actionWords.includes(word)) score += 1.5;
      if (word.length > 6) score += 0.5;
    });

    score += sentence.length / 100;

    return score;
  }

  private truncateToWords(text: string, maxWords: number): string {
    const words = text.split(/\s+/);
    if (words.length <= maxWords) {
      return text.trim();
    }
    return words.slice(0, maxWords).join(' ') + '...';
  }

  extractKeyPoints(memories: Memory[]): string[] {
    const keyPoints: string[] = [];
    
    memories.forEach(memory => {
      const sentences = memory.content.split(/[.!?]+/);
      sentences.forEach((sentence: string) => {
        if (this.calculateSentenceScore(sentence) > 2) {
          keyPoints.push(sentence.trim());
        }
      });
    });

    return keyPoints.slice(0, 10);
  }
}
