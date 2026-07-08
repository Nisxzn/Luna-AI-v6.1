import { Memory, MemoryFilter, MemorySearchQuery, MemoryConfig, MemoryStats, MemoryCategory } from '@luna-ai/types';
import { MemoryStore } from '../store/MemoryStore';
import { MemoryIndex } from '../index/MemoryIndex';
import { MemoryRetrieval } from '../retrieval/MemoryRetrieval';
import { MemoryRanking } from '../ranking/MemoryRanking';
import { MemorySummarizer } from '../summarizer/MemorySummarizer';
import { MemoryCleaner } from '../cleaner/MemoryCleaner';
import { MemorySyncService } from '../sync/MemorySyncService';

export class MemoryManager {
  private store: MemoryStore;
  private index: MemoryIndex;
  private retrieval: MemoryRetrieval;
  private ranking: MemoryRanking;
  private summarizer: MemorySummarizer;
  private cleaner: MemoryCleaner;
  private sync: MemorySyncService;
  private config: MemoryConfig;
  private cache: Map<string, Memory>;

  constructor(dbPath?: string, config?: Partial<MemoryConfig>) {
    this.store = new MemoryStore(dbPath);
    this.index = new MemoryIndex();
    this.retrieval = new MemoryRetrieval(this.store, this.index);
    this.ranking = new MemoryRanking();
    this.summarizer = new MemorySummarizer();
    this.sync = new MemorySyncService(this.store, this.index);
    this.cache = new Map();
    
    this.config = {
      maxMemories: 10000,
      maxMemorySize: 100000000,
      autoArchiveDays: 90,
      autoDeleteDays: 365,
      enableSummarization: true,
      summarizationThreshold: 500,
      ...config,
    };

    this.cleaner = new MemoryCleaner(this.store, this.index, this.config);
    this.initializeIndex();
  }

  private initializeIndex(): void {
    const memories = this.store.getAll(10000);
    memories.forEach(memory => {
      this.index.indexMemory(memory);
    });
  }

  save(memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'>): Memory {
    const saved = this.store.save(memory);
    this.index.indexMemory(saved);
    this.sync.syncMemory(saved);
    this.cache.set(saved.id, saved);
    return saved;
  }

  get(id: string): Memory | null {
    const cached = this.cache.get(id);
    if (cached) return cached;

    const memory = this.store.getById(id);
    if (memory) {
      this.cache.set(id, memory);
    }
    return memory;
  }

  update(id: string, updates: Partial<Omit<Memory, 'id' | 'createdAt'>>): Memory | null {
    const memory = this.store.getById(id);
    if (!memory) return null;

    const updated = this.store.update(id, updates);
    if (updated) {
      this.index.updateMemory(updated);
      this.sync.syncMemory(updated);
      this.cache.set(id, updated);
    }
    return updated;
  }

  delete(id: string): boolean {
    const result = this.store.delete(id);
    if (result) {
      this.index.removeMemory(id);
      this.sync.syncDelete(id);
      this.cache.delete(id);
    }
    return result;
  }

  archive(id: string): boolean {
    const result = this.store.archive(id);
    if (result) {
      this.sync.syncArchive(id);
    }
    return result;
  }

  unarchive(id: string): boolean {
    const result = this.store.unarchive(id);
    if (result) {
      this.sync.syncUnarchive(id);
    }
    return result;
  }

  search(query: MemorySearchQuery) {
    return this.retrieval.retrieve(query);
  }

  find(filter: MemoryFilter, limit = 100, offset = 0): Memory[] {
    return this.store.find(filter, limit, offset);
  }

  retrieveRelevant(context: string, filter: MemoryFilter = {}, limit = 10): Memory[] {
    return this.retrieval.retrieveRelevant(context, filter, limit);
  }

  rank(memories: Memory[], context?: string) {
    return this.ranking.rankMemories(memories, context);
  }

  summarize(memories: Memory[], maxWords?: number) {
    return this.summarizer.summarizeConversation(memories, maxWords);
  }

  cleanup(): { archived: number; deleted: number; duplicates: number; empty: number } {
    const result = this.cleaner.runFullCleanup();
    this.cache.clear();
    return result;
  }

  getStats(): MemoryStats {
    const allMemories = this.store.getAll(10000);
    const totalMemories = allMemories.length;
    const memoriesByCategory: Record<MemoryCategory, number> = {
      conversation: 0,
      project: 0,
      workspace: 0,
      user_preference: 0,
      session: 0,
    };
    const memoriesByImportance: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    let totalSize = 0;
    let oldestMemory: Date | undefined;
    let newestMemory: Date | undefined;

    allMemories.forEach(memory => {
      memoriesByCategory[memory.category]++;
      memoriesByImportance[memory.importance]++;
      totalSize += memory.content.length + memory.title.length;

      if (!oldestMemory || memory.createdAt < oldestMemory) {
        oldestMemory = memory.createdAt;
      }
      if (!newestMemory || memory.createdAt > newestMemory) {
        newestMemory = memory.createdAt;
      }
    });

    return {
      totalMemories,
      memoriesByCategory,
      memoriesByImportance: memoriesByImportance as any,
      totalSize,
      oldestMemory,
      newestMemory,
    };
  }

  getConfig(): MemoryConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<MemoryConfig>): void {
    this.config = { ...this.config, ...config };
    this.cleaner.updateConfig(config);
  }

  getSyncService(): MemorySyncService {
    return this.sync;
  }

  clearCache(): void {
    this.cache.clear();
  }

  close(): void {
    this.store.close();
  }
}
