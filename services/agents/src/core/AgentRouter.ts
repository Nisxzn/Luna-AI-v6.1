import {
  AgentRouter as IAgentRouter,
  Task,
  AgentContext,
  AgentCategory,
  AgentMetrics,
} from '@luna-ai/types';
import { AgentRegistry } from './AgentRegistry';

export class AgentRouter implements IAgentRouter {
  private registry: AgentRegistry;
  private agentPerformance: Map<string, { successRate: number; avgTime: number; totalExecutions: number }>;

  constructor(registry: AgentRegistry) {
    this.registry = registry;
    this.agentPerformance = new Map();
  }

  async route(task: Task): Promise<string> {
    const agentId = await this.getBestAgent(task.type);
    if (!agentId) {
      throw new Error(`No agent available for task type: ${task.type}`);
    }
    return agentId;
  }

  async getBestAgent(taskType: string): Promise<string | null> {
    const agents = await this.registry.list();

    // Filter agents that can handle the task type
    const capableAgents = agents.filter(entry =>
      entry.config.capabilities.some(cap => cap.inputTypes.includes(taskType))
    );

    if (capableAgents.length === 0) {
      return null;
    }

    // Sort by performance metrics
    const sortedAgents = capableAgents.sort((a, b) => {
      const perfA = this.agentPerformance.get(a.config.id) || { successRate: 0, avgTime: Infinity };
      const perfB = this.agentPerformance.get(b.config.id) || { successRate: 0, avgTime: Infinity };

      // Prefer higher success rate
      if (perfA.successRate !== perfB.successRate) {
        return perfB.successRate - perfA.successRate;
      }

      // Then prefer faster execution time
      return perfA.avgTime - perfB.avgTime;
    });

    // Return the best performing agent
    return sortedAgents[0].config.id;
  }

  async updateAgentMetrics(agentId: string, success: boolean, executionTime: number): Promise<void> {
    const current = this.agentPerformance.get(agentId) || {
      successRate: 0,
      avgTime: 0,
      totalExecutions: 0,
    };

    const totalExecutions = current.totalExecutions + 1;
    const successCount = success ? (current.successRate * (totalExecutions - 1)) + 1 : current.successRate * (totalExecutions - 1);
    const successRate = successCount / totalExecutions;
    const avgTime = (current.avgTime * (totalExecutions - 1) + executionTime) / totalExecutions;

    this.agentPerformance.set(agentId, {
      successRate,
      avgTime,
      totalExecutions,
    });
  }

  getAgentPerformance(agentId: string): { successRate: number; avgTime: number; totalExecutions: number } | undefined {
    return this.agentPerformance.get(agentId);
  }

  clearPerformanceMetrics(): void {
    this.agentPerformance.clear();
  }
}
