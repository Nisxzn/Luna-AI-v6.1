import { Memory, MemoryFilter, MemoryCategory, MemoryImportance } from '@luna-ai/types';

export interface IndexEntry {
  memoryId: string;
  category: MemoryCategory;
  importance: MemoryImportance;
  tags: string[];
  projectId?: string;
  workspaceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class MemoryIndex {
  private index: Map<string, IndexEntry>;
  private tagIndex: Map<string, Set<string>>;
  private projectIndex: Map<string, Set<string>>;
  private workspaceIndex: Map<string, Set<string>>;
  private categoryIndex: Map<MemoryCategory, Set<string>>;

  constructor() {
    this.index = new Map();
    this.tagIndex = new Map();
    this.projectIndex = new Map();
    this.workspaceIndex = new Map();
    this.categoryIndex = new Map();
  }

  indexMemory(memory: Memory): void {
    const entry: IndexEntry = {
      memoryId: memory.id,
      category: memory.category,
      importance: memory.importance,
      tags: memory.tags,
      projectId: memory.projectId,
      workspaceId: memory.workspaceId,
      createdAt: memory.createdAt,
      updatedAt: memory.updatedAt,
    };

    this.index.set(memory.id, entry);

    memory.tags.forEach((tag: string) => {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(memory.id);
    });

    if (memory.projectId) {
      if (!this.projectIndex.has(memory.projectId)) {
        this.projectIndex.set(memory.projectId, new Set());
      }
      this.projectIndex.get(memory.projectId)!.add(memory.id);
    }

    if (memory.workspaceId) {
      if (!this.workspaceIndex.has(memory.workspaceId)) {
        this.workspaceIndex.set(memory.workspaceId, new Set());
      }
      this.workspaceIndex.get(memory.workspaceId)!.add(memory.id);
    }

    if (!this.categoryIndex.has(memory.category)) {
      this.categoryIndex.set(memory.category, new Set());
    }
    this.categoryIndex.get(memory.category)!.add(memory.id);
  }

  removeMemory(memoryId: string): void {
    const entry = this.index.get(memoryId);
    if (!entry) return;

    entry.tags.forEach(tag => {
      const tagSet = this.tagIndex.get(tag);
      if (tagSet) {
        tagSet.delete(memoryId);
        if (tagSet.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    });

    if (entry.projectId) {
      const projectSet = this.projectIndex.get(entry.projectId);
      if (projectSet) {
        projectSet.delete(memoryId);
        if (projectSet.size === 0) {
          this.projectIndex.delete(entry.projectId);
        }
      }
    }

    if (entry.workspaceId) {
      const workspaceSet = this.workspaceIndex.get(entry.workspaceId);
      if (workspaceSet) {
        workspaceSet.delete(memoryId);
        if (workspaceSet.size === 0) {
          this.workspaceIndex.delete(entry.workspaceId);
        }
      }
    }

    const categorySet = this.categoryIndex.get(entry.category);
    if (categorySet) {
      categorySet.delete(memoryId);
      if (categorySet.size === 0) {
        this.categoryIndex.delete(entry.category);
      }
    }

    this.index.delete(memoryId);
  }

  updateMemory(memory: Memory): void {
    this.removeMemory(memory.id);
    this.indexMemory(memory);
  }

  findByTag(tag: string): Set<string> {
    return this.tagIndex.get(tag) || new Set();
  }

  findByProject(projectId: string): Set<string> {
    return this.projectIndex.get(projectId) || new Set();
  }

  findByWorkspace(workspaceId: string): Set<string> {
    return this.workspaceIndex.get(workspaceId) || new Set();
  }

  findByCategory(category: MemoryCategory): Set<string> {
    return this.categoryIndex.get(category) || new Set();
  }

  findByTags(tags: string[]): Set<string> {
    if (tags.length === 0) return new Set();

    const results = this.findByTag(tags[0]);
    for (let i = 1; i < tags.length; i++) {
      const current = this.findByTag(tags[i]);
      for (const id of results) {
        if (!current.has(id)) {
          results.delete(id);
        }
      }
    }
    return results;
  }

  query(filter: MemoryFilter = {}): Set<string> {
    let results: Set<string> = new Set(this.index.keys());

    if (filter.category) {
      const categoryResults = this.findByCategory(filter.category);
      results = this.intersect(results, categoryResults);
    }

    if (filter.projectId) {
      const projectResults = this.findByProject(filter.projectId);
      results = this.intersect(results, projectResults);
    }

    if (filter.workspaceId) {
      const workspaceResults = this.findByWorkspace(filter.workspaceId);
      results = this.intersect(results, workspaceResults);
    }

    if (filter.tags && filter.tags.length > 0) {
      const tagResults = this.findByTags(filter.tags);
      results = this.intersect(results, tagResults);
    }

    return results;
  }

  private intersect(setA: Set<string>, setB: Set<string>): Set<string> {
    const result = new Set<string>();
    for (const item of setA) {
      if (setB.has(item)) {
        result.add(item);
      }
    }
    return result;
  }

  getEntry(memoryId: string): IndexEntry | undefined {
    return this.index.get(memoryId);
  }

  getAllEntries(): IndexEntry[] {
    return Array.from(this.index.values());
  }

  getSize(): number {
    return this.index.size;
  }

  clear(): void {
    this.index.clear();
    this.tagIndex.clear();
    this.projectIndex.clear();
    this.workspaceIndex.clear();
    this.categoryIndex.clear();
  }
}
