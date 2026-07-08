import { Memory, MemoryFilter, MemorySearchQuery, MemorySearchResult } from '@luna-ai/types';
import { MemoryStore } from '../store/MemoryStore';
import { MemoryIndex } from '../index/MemoryIndex';

export class MemoryRetrieval {
  private store: MemoryStore;
  private index: MemoryIndex;

  constructor(store: MemoryStore, index: MemoryIndex) {
    this.store = store;
    this.index = index;
  }

  retrieve(query: MemorySearchQuery): MemorySearchResult {
    const { query: searchQuery, filters = {}, limit = 100, offset = 0 } = query;

    if (!searchQuery || searchQuery.trim() === '') {
      const memories = this.store.find(filters, limit, offset);
      const total = this.store.count(filters);
      return {
        memories,
        total,
        query: searchQuery,
      };
    }

    const indexedIds = this.index.query(filters);
    const memories = this.store.search(searchQuery, filters, limit);

    const filteredMemories = memories.filter(memory => indexedIds.has(memory.id));

    const total = filteredMemories.length;

    return {
      memories: filteredMemories.slice(offset, offset + limit),
      total,
      query: searchQuery,
    };
  }

  retrieveById(id: string): Memory | null {
    return this.store.getById(id);
  }

  retrieveByFilter(filter: MemoryFilter, limit = 100, offset = 0): Memory[] {
    return this.store.find(filter, limit, offset);
  }

  retrieveByTags(tags: string[], limit = 100): Memory[] {
    const memoryIds = this.index.findByTags(tags);
    const memories: Memory[] = [];

    for (const id of memoryIds) {
      const memory = this.store.getById(id);
      if (memory) {
        memories.push(memory);
        if (memories.length >= limit) break;
      }
    }

    return memories;
  }

  retrieveByProject(projectId: string, limit = 100): Memory[] {
    const memoryIds = this.index.findByProject(projectId);
    const memories: Memory[] = [];

    for (const id of memoryIds) {
      const memory = this.store.getById(id);
      if (memory) {
        memories.push(memory);
        if (memories.length >= limit) break;
      }
    }

    return memories;
  }

  retrieveByWorkspace(workspaceId: string, limit = 100): Memory[] {
    const memoryIds = this.index.findByWorkspace(workspaceId);
    const memories: Memory[] = [];

    for (const id of memoryIds) {
      const memory = this.store.getById(id);
      if (memory) {
        memories.push(memory);
        if (memories.length >= limit) break;
      }
    }

    return memories;
  }

  retrieveRecent(limit = 100, offset = 0): Memory[] {
    return this.store.getAll(limit, offset);
  }

  retrieveRelevant(context: string, filter: MemoryFilter = {}, limit = 10): Memory[] {
    const keywords = this.extractKeywords(context);
    const allMemories = this.store.find(filter, 500);
    
    const scoredMemories = allMemories.map(memory => ({
      memory,
      score: this.calculateRelevanceScore(memory, keywords),
    }));

    scoredMemories.sort((a, b) => b.score - a.score);

    return scoredMemories.slice(0, limit).map(item => item.memory);
  }

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'and', 'but', 'if', 'or', 'because', 'until', 'while', 'although', 'though', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'this', 'that', 'these', 'those']);
    
    return words.filter(word => word.length > 2 && !stopWords.has(word));
  }

  private calculateRelevanceScore(memory: Memory, keywords: string[]): number {
    const title = memory.title.toLowerCase();
    const content = memory.content.toLowerCase();
    const tags = memory.tags.map((tag: string) => tag.toLowerCase());

    let score = 0;

    keywords.forEach((keyword: string) => {
      if (title.includes(keyword)) {
        score += 3;
      }
      if (content.includes(keyword)) {
        score += 1;
      }
      tags.forEach((tag: string) => {
        if (tag.includes(keyword)) {
          score += 2;
        }
      });
    });

    const importanceScores: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
    score += importanceScores[memory.importance];

    const daysSinceUpdate = (Date.now() - memory.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    score += Math.max(0, 10 - daysSinceUpdate / 10);

    return score;
  }
}
