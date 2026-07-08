import { Memory, MemoryFilter, MemoryConfig } from '@luna-ai/types';
import { MemoryStore } from '../store/MemoryStore';
import { MemoryIndex } from '../index/MemoryIndex';

export class MemoryCleaner {
  private store: MemoryStore;
  private index: MemoryIndex;
  private config: MemoryConfig;

  constructor(store: MemoryStore, index: MemoryIndex, config: MemoryConfig) {
    this.store = store;
    this.index = index;
    this.config = config;
  }

  cleanupOldMemories(): { archived: number; deleted: number } {
    const now = new Date();
    const archiveDate = new Date(now.getTime() - this.config.autoArchiveDays * 24 * 60 * 60 * 1000);
    const deleteDate = new Date(now.getTime() - this.config.autoDeleteDays * 24 * 60 * 60 * 1000);

    let archived = 0;
    let deleted = 0;

    const allMemories = this.store.getAll(10000);
    
    allMemories.forEach(memory => {
      if (memory.updatedAt < deleteDate && !memory.archived) {
        this.store.archive(memory.id);
        archived++;
      } else if (memory.updatedAt < deleteDate && memory.archived) {
        this.store.delete(memory.id);
        this.index.removeMemory(memory.id);
        deleted++;
      }
    });

    return { archived, deleted };
  }

  enforceMemoryLimit(): number {
    const totalMemories = this.store.count();
    
    if (totalMemories <= this.config.maxMemories) {
      return 0;
    }

    const excess = totalMemories - this.config.maxMemories;
    const memories = this.store.getAll(excess + 100);
    
    let deleted = 0;
    memories.forEach(memory => {
      if (deleted < excess && memory.importance !== 'critical') {
        this.store.delete(memory.id);
        this.index.removeMemory(memory.id);
        deleted++;
      }
    });

    return deleted;
  }

  enforceSizeLimit(): number {
    const memories = this.store.getAll(10000);
    let totalSize = 0;
    
    memories.forEach(memory => {
      totalSize += memory.content.length + memory.title.length;
    });

    if (totalSize <= this.config.maxMemorySize) {
      return 0;
    }

    const excessSize = totalSize - this.config.maxMemorySize;
    let deleted = 0;
    let freedSize = 0;

    const sortedMemories = memories.sort((a, b) => {
      const importanceOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
      return importanceOrder[a.importance] - importanceOrder[b.importance];
    });

    for (const memory of sortedMemories) {
      if (freedSize >= excessSize || memory.importance === 'critical') {
        break;
      }

      const memorySize = memory.content.length + memory.title.length;
      this.store.delete(memory.id);
      this.index.removeMemory(memory.id);
      freedSize += memorySize;
      deleted++;
    }

    return deleted;
  }

  cleanupDuplicates(): number {
    const memories = this.store.getAll(10000);
    const seen = new Map<string, string>();
    let deleted = 0;

    memories.forEach(memory => {
      const key = `${memory.title}|${memory.content.substring(0, 100)}`;
      
      if (seen.has(key)) {
        this.store.delete(memory.id);
        this.index.removeMemory(memory.id);
        deleted++;
      } else {
        seen.set(key, memory.id);
      }
    });

    return deleted;
  }

  cleanupEmptyMemories(): number {
    const memories = this.store.getAll(10000);
    let deleted = 0;

    memories.forEach(memory => {
      if (memory.content.trim().length === 0 || memory.title.trim().length === 0) {
        this.store.delete(memory.id);
        this.index.removeMemory(memory.id);
        deleted++;
      }
    });

    return deleted;
  }

  archiveByFilter(filter: MemoryFilter): number {
    const memories = this.store.find(filter, 10000);
    let archived = 0;

    memories.forEach(memory => {
      if (!memory.archived) {
        this.store.archive(memory.id);
        archived++;
      }
    });

    return archived;
  }

  deleteByFilter(filter: MemoryFilter): number {
    const memories = this.store.find(filter, 10000);
    let deleted = 0;

    memories.forEach(memory => {
      this.store.delete(memory.id);
      this.index.removeMemory(memory.id);
      deleted++;
    });

    return deleted;
  }

  runFullCleanup(): { archived: number; deleted: number; duplicates: number; empty: number } {
    const oldMemories = this.cleanupOldMemories();
    const duplicates = this.cleanupDuplicates();
    const empty = this.cleanupEmptyMemories();
    const limitDeleted = this.enforceMemoryLimit();
    const sizeDeleted = this.enforceSizeLimit();

    return {
      archived: oldMemories.archived,
      deleted: oldMemories.deleted + limitDeleted + sizeDeleted,
      duplicates,
      empty,
    };
  }

  updateConfig(config: Partial<MemoryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): MemoryConfig {
    return { ...this.config };
  }
}
