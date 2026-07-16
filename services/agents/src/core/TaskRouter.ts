import { Task, TaskType, AgentCapability, AgentConfig, BaseAgent } from '@luna-ai/types';

export class TaskRouter {
  private agentCapabilities: Map<string, AgentCapability[]>;
  private agentMetrics: Map<string, AgentMetrics>;
  private capabilityToAgents: Map<string, string[]>;

  constructor() {
    this.agentCapabilities = new Map();
    this.agentMetrics = new Map();
    this.capabilityToAgents = new Map();
  }

  registerAgent(agent: BaseAgent, config: AgentConfig): void {
    this.agentCapabilities.set(agent.id, config.capabilities);
    this.agentMetrics.set(agent.id, {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      currentStatus: 'idle',
    });

    // Update capability to agents mapping
    for (const capability of config.capabilities) {
      const agents = this.capabilityToAgents.get(capability.name) || [];
      if (!agents.includes(agent.id)) {
        agents.push(agent.id);
        this.capabilityToAgents.set(capability.name, agents);
      }
    }
  }

  unregisterAgent(agentId: string): void {
    const capabilities = this.agentCapabilities.get(agentId);
    if (capabilities) {
      for (const capability of capabilities) {
        const agents = this.capabilityToAgents.get(capability.name) || [];
        const index = agents.indexOf(agentId);
        if (index > -1) {
          agents.splice(index, 1);
          this.capabilityToAgents.set(capability.name, agents);
        }
      }
    }
    this.agentCapabilities.delete(agentId);
    this.agentMetrics.delete(agentId);
  }

  async route(task: Task): Promise<string | null> {
    const requiredCapabilities = this.getRequiredCapabilities(task);
    const compatibleAgents = this.findCompatibleAgents(requiredCapabilities);

    if (compatibleAgents.length === 0) {
      return null;
    }

    return this.selectBestAgent(compatibleAgents, task);
  }

  async getBestAgent(taskType: TaskType): Promise<string | null> {
    const requiredCapabilities = this.getCapabilitiesForTaskType(taskType);
    const compatibleAgents = this.findCompatibleAgents(requiredCapabilities);

    if (compatibleAgents.length === 0) {
      return null;
    }

    return this.selectBestAgent(compatibleAgents, { type: taskType } as Task);
  }

  validateAgentCapabilities(agentId: string, task: Task): boolean {
    const agentCapabilities = this.agentCapabilities.get(agentId);
    if (!agentCapabilities) {
      return false;
    }

    const requiredCapabilities = this.getRequiredCapabilities(task);
    return this.hasCapabilities(agentCapabilities, requiredCapabilities);
  }

  updateAgentMetrics(agentId: string, success: boolean, executionTime: number): void {
    const metrics = this.agentMetrics.get(agentId);
    if (!metrics) {
      return;
    }

    metrics.totalExecutions++;
    if (success) {
      metrics.successfulExecutions++;
    } else {
      metrics.failedExecutions++;
    }

    // Update average execution time
    const totalTime = metrics.averageExecutionTime * (metrics.totalExecutions - 1) + executionTime;
    metrics.averageExecutionTime = totalTime / metrics.totalExecutions;

    this.agentMetrics.set(agentId, metrics);
  }

  getAgentMetrics(agentId: string): AgentMetrics | null {
    return this.agentMetrics.get(agentId) || null;
  }

  getAllAgentMetrics(): Map<string, AgentMetrics> {
    return new Map(this.agentMetrics);
  }

  /**
   * Returns every agent id that has registered the given capability name.
   * Useful for verifying registration correctness.
   */
  getAgentsForCapability(capabilityName: string): string[] {
    return [...(this.capabilityToAgents.get(capabilityName) ?? [])];
  }

  /**
   * Returns the full set of capability names currently registered across all
   * agents. Useful for verifying that all expected capabilities are present.
   */
  listRegisteredCapabilities(): string[] {
    return [...this.capabilityToAgents.keys()].sort();
  }

  /**
   * Returns the ids of every agent currently registered with this router.
   */
  listRegisteredAgents(): string[] {
    return [...this.agentCapabilities.keys()];
  }

  private getRequiredCapabilities(task: Task): string[] {
    return this.getCapabilitiesForTaskType(task.type);
  }

  private getCapabilitiesForTaskType(taskType: TaskType): string[] {
    switch (taskType) {
      // ---- Development task types ----------------------------------------
      case 'code_generation':
        // CodingAgent: requires code_generation + file_write
        return ['code_generation', 'file_write'];

      case 'debugging':
        // DebuggingAgent: requires code_analysis + error_detection
        return ['code_analysis', 'error_detection'];

      case 'testing':
        // TestingAgent: requires test_execution + code_analysis
        return ['test_execution', 'code_analysis'];

      case 'documentation':
        // DocumentationAgent: requires documentation_generation + code_analysis
        return ['documentation_generation', 'code_analysis'];

      case 'refactoring':
        // RefactoringAgent: requires code_analysis + code_transformation
        return ['code_analysis', 'code_transformation'];

      // ---- Search task type -----------------------------------------------
      case 'search':
        // WorkspaceAgent (file_search + search) and RAGAgent (rag_retrieve + search)
        // both satisfy this; minimum discriminating capability is 'search'.
        return ['search'];

      // ---- Analysis task type --------------------------------------------
      case 'analysis':
        // ReviewAgent and debugging/testing agents all advertise code_analysis.
        // pattern_recognition is declared by ReviewAgent only, so requiring it
        // routes analysis tasks exclusively to ReviewAgent.
        return ['code_analysis', 'pattern_recognition'];

      // ---- General task type ---------------------------------------------
      case 'general':
        // ChatAgent, MemoryAgent, RAGAgent, and WorkspaceAgent all declare
        // general_processing, letting the scoring algorithm pick the best fit.
        return ['general_processing'];
    }
  }

  private findCompatibleAgents(requiredCapabilities: string[]): string[] {
    if (requiredCapabilities.length === 0) {
      return [];
    }

    const agentScores = new Map<string, number>();

    for (const capability of requiredCapabilities) {
      const agents = this.capabilityToAgents.get(capability) || [];
      for (const agentId of agents) {
        const currentScore = agentScores.get(agentId) || 0;
        agentScores.set(agentId, currentScore + 1);
      }
    }

    // Filter agents that have all required capabilities
    const compatibleAgents: string[] = [];
    for (const [agentId, score] of agentScores.entries()) {
      if (score === requiredCapabilities.length) {
        compatibleAgents.push(agentId);
      }
    }

    return compatibleAgents;
  }

  private selectBestAgent(compatibleAgents: string[], task: Task): string {
    if (compatibleAgents.length === 1) {
      return compatibleAgents[0];
    }

    // Score agents based on metrics
    const scoredAgents = compatibleAgents.map(agentId => {
      const metrics = this.agentMetrics.get(agentId);
      if (!metrics) {
        return { agentId, score: 0 };
      }

      // Calculate score based on success rate and average execution time
      const successRate = metrics.totalExecutions > 0
        ? metrics.successfulExecutions / metrics.totalExecutions
        : 0.5;

      const timeScore = metrics.averageExecutionTime > 0
        ? 1 / metrics.averageExecutionTime
        : 1;

      const score = successRate * 0.7 + timeScore * 0.3;
      return { agentId, score };
    });

    // Sort by score and return the best
    scoredAgents.sort((a, b) => b.score - a.score);
    return scoredAgents[0].agentId;
  }

  private hasCapabilities(agentCapabilities: AgentCapability[], required: string[]): boolean {
    const agentCapabilityNames = new Set(agentCapabilities.map(c => c.name));
    return required.every(cap => agentCapabilityNames.has(cap));
  }
}

interface AgentMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  currentStatus: 'idle' | 'busy' | 'error' | 'cancelled';
}
