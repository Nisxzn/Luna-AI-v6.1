import { AgentMemoryAdapter as IAgentMemoryAdapter, AgentContext, Memory } from '@luna-ai/types';

export class AgentMemoryAdapter implements IAgentMemoryAdapter {
  private memoryManager: any;

  constructor(memoryManager: any) {
    this.memoryManager = memoryManager;
  }

  async getContext(context: AgentContext): Promise<string> {
    const memories: Memory[] = [];

    // Get workspace memories
    if (context.workspaceId) {
      const workspaceMemories = await this.memoryManager.find({
        workspaceId: context.workspaceId,
        archived: false,
      }, 20);
      memories.push(...workspaceMemories);
    }

    // Get project memories
    if (context.projectId) {
      const projectMemories = await this.memoryManager.find({
        workspaceId: context.workspaceId,
        projectId: context.projectId,
        archived: false,
      }, 20);
      memories.push(...projectMemories);
    }

    // Get session memories
    if (context.sessionId) {
      const sessionMemories = await this.memoryManager.find({
        tags: [context.sessionId],
        archived: false,
      }, 10);
      memories.push(...sessionMemories);
    }

    // Combine memories into context string
    if (memories.length === 0) {
      return '';
    }

    return memories
      .map((memory: any) => `[${memory.category}] ${memory.title}: ${memory.content}`)
      .join('\n\n');
  }

  async saveContext(context: AgentContext, data: string): Promise<void> {
    const memory: any = {
      title: `Agent Context - ${context.workspaceId || 'global'}`,
      content: data,
      category: 'conversation' as const,
      source: 'ai' as const,
      importance: 'medium' as const,
      tags: ['agent-context', context.sessionId || 'default'].filter(Boolean),
      workspaceId: context.workspaceId,
      projectId: context.projectId,
    };

    await this.memoryManager.save(memory);
  }

  async searchContext(query: string, context: AgentContext): Promise<string[]> {
    const filter = {
      workspaceId: context.workspaceId,
      projectId: context.projectId,
      archived: false,
    };

    const searchResult = await this.memoryManager.search({
      query,
      filters: filter,
      limit: 10,
    });

    return searchResult.memories.map((memory: any) => memory.content);
  }
}
