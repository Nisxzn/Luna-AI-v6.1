import {
  AgentManager as IAgentManager,
  BaseAgent,
  AgentConfig,
  AgentMetrics,
  AgentCategory,
  AgentStatus,
  AgentRegistryEntry,
  AgentInput,
  AgentOutput,
  AgentContext,
} from '@luna-ai/types';
import { AgentRegistry } from './AgentRegistry';
import { AgentLogger } from './AgentLogger';
import { AgentLifecycleManager } from './AgentLifecycleManager';
import { AgentStateManager } from './AgentStateManager';

export class AgentManager implements IAgentManager {
  private registry: AgentRegistry;
  private logger: AgentLogger;
  private lifecycleManager: AgentLifecycleManager;
  private stateManager: AgentStateManager;

  constructor(logger: AgentLogger) {
    this.registry = new AgentRegistry();
    this.logger = logger;
    this.stateManager = new AgentStateManager();
    this.lifecycleManager = new AgentLifecycleManager(this.stateManager, logger);
  }

  async registerAgent(agent: BaseAgent, config: AgentConfig): Promise<void> {
    this.logger.info(config.id, `Registering agent: ${config.name}`, 'registration');

    const metrics: AgentMetrics = {
      agentId: config.id,
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageExecutionTime: 0,
      currentStatus: 'idle',
    };

    const entry: AgentRegistryEntry = {
      config,
      instance: agent,
      metrics,
      registeredAt: new Date(),
    };

    await this.registry.register(entry);
    await this.lifecycleManager.register(agent);
    this.logger.info(config.id, 'Agent registered successfully', 'registration');
  }

  async unregisterAgent(agentId: string): Promise<void> {
    this.logger.info(agentId, 'Unregistering agent', 'registration');
    await this.registry.unregister(agentId);
    this.stateManager.reset(agentId);
    this.logger.info(agentId, 'Agent unregistered successfully', 'registration');
  }

  async getAgent(agentId: string): Promise<BaseAgent | null> {
    const entry = await this.registry.get(agentId);
    return entry?.instance || null;
  }

  async listAgents(category?: AgentCategory): Promise<BaseAgent[]> {
    const entries = await this.registry.list(category);
    return entries.map(entry => entry.instance);
  }

  async getAgentMetrics(agentId: string): Promise<AgentMetrics | null> {
    const entry = await this.registry.get(agentId);
    return entry?.metrics || null;
  }

  async updateAgentStatus(agentId: string, status: AgentStatus): Promise<void> {
    await this.registry.updateMetrics(agentId, { currentStatus: status });
  }

  getRegistry(): AgentRegistry {
    return this.registry;
  }

  // Lifecycle methods
  async startAgent(agentId: string): Promise<void> {
    this.logger.info(agentId, 'Starting agent', 'lifecycle');
    await this.lifecycleManager.initialize(agentId);
    await this.lifecycleManager.activate(agentId);
    await this.updateAgentStatus(agentId, 'idle');
  }

  async stopAgent(agentId: string): Promise<void> {
    this.logger.info(agentId, 'Stopping agent', 'lifecycle');
    await this.lifecycleManager.shutdown(agentId);
    await this.updateAgentStatus(agentId, 'idle');
  }

  async restartAgent(agentId: string): Promise<void> {
    this.logger.info(agentId, 'Restarting agent', 'lifecycle');
    await this.stopAgent(agentId);
    await this.startAgent(agentId);
  }

  async pauseAgent(agentId: string): Promise<void> {
    this.logger.info(agentId, 'Pausing agent', 'lifecycle');
    await this.lifecycleManager.pause(agentId);
    await this.updateAgentStatus(agentId, 'error');
  }

  async resumeAgent(agentId: string): Promise<void> {
    this.logger.info(agentId, 'Resuming agent', 'lifecycle');
    await this.lifecycleManager.resume(agentId);
    await this.updateAgentStatus(agentId, 'busy');
  }

  async monitorHealth(agentId: string): Promise<boolean> {
    const entry = await this.registry.get(agentId);
    if (!entry) {
      this.logger.warn(agentId, 'Agent not found for health check', 'health');
      return false;
    }

    const isHealthy = entry.metrics.currentStatus !== 'error';
    this.logger.info(agentId, `Health check: ${isHealthy ? 'healthy' : 'unhealthy'}`, 'health');
    return isHealthy;
  }

  async collectMetrics(agentId: string): Promise<AgentMetrics | null> {
    const entry = await this.registry.get(agentId);
    if (!entry) {
      this.logger.warn(agentId, 'Agent not found for metrics collection', 'metrics');
      return null;
    }

    this.logger.info(agentId, 'Metrics collected', 'metrics');
    return entry.metrics;
  }

  getLifecycleManager(): AgentLifecycleManager {
    return this.lifecycleManager;
  }

  getStateManager(): AgentStateManager {
    return this.stateManager;
  }
}
