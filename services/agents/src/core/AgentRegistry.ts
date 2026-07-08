import {
  AgentRegistryEntry,
  AgentCategory,
  BaseAgent,
  AgentConfig,
  AgentMetrics,
  AgentStatus,
  AgentCapability,
} from '@luna-ai/types';

export class AgentRegistry {
  private entries: Map<string, AgentRegistryEntry>;

  constructor() {
    this.entries = new Map();
  }

  async register(entry: AgentRegistryEntry): Promise<void> {
    if (this.entries.has(entry.config.id)) {
      throw new Error(`Agent with id ${entry.config.id} is already registered`);
    }
    this.entries.set(entry.config.id, entry);
  }

  async unregister(agentId: string): Promise<void> {
    if (!this.entries.has(agentId)) {
      throw new Error(`Agent with id ${agentId} is not registered`);
    }
    this.entries.delete(agentId);
  }

  async get(agentId: string): Promise<AgentRegistryEntry | null> {
    return this.entries.get(agentId) || null;
  }

  async list(category?: AgentCategory): Promise<AgentRegistryEntry[]> {
    const allEntries = Array.from(this.entries.values());
    if (category) {
      return allEntries.filter(entry => entry.config.category === category);
    }
    return allEntries;
  }

  async exists(agentId: string): Promise<boolean> {
    return this.entries.has(agentId);
  }

  async updateMetrics(agentId: string, metrics: Partial<AgentMetrics>): Promise<void> {
    const entry = this.entries.get(agentId);
    if (entry) {
      entry.metrics = { ...entry.metrics, ...metrics };
    }
  }

  async getAgentCount(category?: AgentCategory): Promise<number> {
    const agents = await this.list(category);
    return agents.length;
  }

  async getByCapability(capability: string): Promise<AgentRegistryEntry[]> {
    const allEntries = Array.from(this.entries.values());
    return allEntries.filter(entry =>
      entry.config.capabilities.some(cap => cap.name === capability)
    );
  }

  async getByCategory(category: AgentCategory): Promise<AgentRegistryEntry[]> {
    return this.list(category);
  }

  async getActiveAgents(): Promise<AgentRegistryEntry[]> {
    const allEntries = Array.from(this.entries.values());
    return allEntries.filter(entry => entry.metrics.currentStatus === 'busy');
  }

  async getById(id: string): Promise<AgentRegistryEntry | null> {
    return this.get(id);
  }

  async getAll(): Promise<AgentRegistryEntry[]> {
    return this.list();
  }

  async getAgentIds(): Promise<string[]> {
    return Array.from(this.entries.keys());
  }

  async clear(): Promise<void> {
    this.entries.clear();
  }
}
