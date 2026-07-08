import { MemoryManager } from '@luna-ai/memory-service';
import { Memory, MemoryFilter, MemoryCategory } from '@luna-ai/types';

export interface WorkspaceContextConfig {
  workspaceId: string;
  projectId?: string;
  autoSaveMemories: boolean;
  maxContextMemories: number;
}

export class WorkspaceContext {
  private memoryManager: MemoryManager;
  private config: WorkspaceContextConfig;

  constructor(memoryManager: MemoryManager, config: WorkspaceContextConfig) {
    this.memoryManager = memoryManager;
    this.config = config;
  }

  async saveWorkspaceMemory(title: string, content: string, tags: string[] = []): Promise<Memory> {
    const memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'> = {
      title,
      content,
      category: 'workspace',
      source: 'system',
      importance: 'medium',
      tags,
      workspaceId: this.config.workspaceId,
      projectId: this.config.projectId,
    };

    return this.memoryManager.save(memory);
  }

  async saveProjectMemory(title: string, content: string, tags: string[] = []): Promise<Memory> {
    if (!this.config.projectId) {
      throw new Error('Project ID is required for project memories');
    }

    const memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'> = {
      title,
      content,
      category: 'project',
      source: 'system',
      importance: 'high',
      tags,
      workspaceId: this.config.workspaceId,
      projectId: this.config.projectId,
    };

    return this.memoryManager.save(memory);
  }

  async saveUserPreference(key: string, value: string): Promise<Memory> {
    const memory: Omit<Memory, 'id' | 'createdAt' | 'updatedAt'> = {
      title: `Preference: ${key}`,
      content: value,
      category: 'user_preference',
      source: 'user',
      importance: 'medium',
      tags: ['preference', key],
      workspaceId: this.config.workspaceId,
    };

    return this.memoryManager.save(memory);
  }

  async getWorkspaceMemories(limit = 100): Promise<Memory[]> {
    const filter: MemoryFilter = {
      workspaceId: this.config.workspaceId,
      archived: false,
    };
    return this.memoryManager.find(filter, limit);
  }

  async getProjectMemories(limit = 100): Promise<Memory[]> {
    if (!this.config.projectId) {
      return [];
    }

    const filter: MemoryFilter = {
      workspaceId: this.config.workspaceId,
      projectId: this.config.projectId,
      archived: false,
    };
    return this.memoryManager.find(filter, limit);
  }

  async getUserPreferences(): Promise<Memory[]> {
    const filter: MemoryFilter = {
      category: 'user_preference',
      workspaceId: this.config.workspaceId,
      archived: false,
    };
    return this.memoryManager.find(filter);
  }

  async getContextForAI(context: string): Promise<string> {
    const filter: MemoryFilter = {
      workspaceId: this.config.workspaceId,
      projectId: this.config.projectId,
      archived: false,
    };

    const relevantMemories = this.memoryManager.retrieveRelevant(context, filter, this.config.maxContextMemories);
    
    if (relevantMemories.length === 0) {
      return '';
    }

    const contextText = relevantMemories
      .map((memory: Memory) => `[${memory.category}] ${memory.title}: ${memory.content}`)
      .join('\n\n');

    return contextText;
  }

  async searchMemories(query: string, limit = 50): Promise<Memory[]> {
    const filter: MemoryFilter = {
      workspaceId: this.config.workspaceId,
      projectId: this.config.projectId,
      archived: false,
    };
    const searchQuery = {
      query,
      filters: filter,
      limit,
    };
    const result = this.memoryManager.search(searchQuery);
    return result.memories;
  }

  async deleteMemory(memoryId: string): Promise<boolean> {
    return this.memoryManager.delete(memoryId);
  }

  async archiveMemory(memoryId: string): Promise<boolean> {
    return this.memoryManager.archive(memoryId);
  }

  getConfig(): WorkspaceContextConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<WorkspaceContextConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getMemoryManager(): MemoryManager {
    return this.memoryManager;
  }
}
