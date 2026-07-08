import {
  BaseAgent,
  AgentInput,
  AgentOutput,
  AgentContext,
  AgentLifecycleManager as IAgentLifecycleManager,
  AgentState,
} from '@luna-ai/types';
import { AgentStateManager } from './AgentStateManager';
import { AgentLogger } from './AgentLogger';

export class AgentLifecycleManager implements IAgentLifecycleManager {
  private agents: Map<string, BaseAgent>;
  private stateManager: AgentStateManager;
  private logger: AgentLogger;

  constructor(stateManager: AgentStateManager, logger: AgentLogger) {
    this.agents = new Map();
    this.stateManager = stateManager;
    this.logger = logger;
  }

  async register(agent: BaseAgent): Promise<void> {
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent with id ${agent.id} is already registered`);
    }
    this.agents.set(agent.id, agent);
    this.stateManager.setState(agent.id, AgentState.Idle);
    this.logger.info(agent.id, 'Agent registered', 'lifecycle');
  }

  async initialize(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent with id ${agentId} not found`);
    }

    const currentState = this.stateManager.getCurrentState(agentId);
    if (currentState !== AgentState.Idle && currentState !== AgentState.Failed) {
      throw new Error(`Cannot initialize agent in state ${currentState}`);
    }

    this.stateManager.setState(agentId, AgentState.Initializing);
    this.logger.info(agentId, 'Initializing agent', 'lifecycle');

    try {
      await agent.initialize();
      this.stateManager.setState(agentId, AgentState.Ready);
      this.logger.info(agentId, 'Agent initialized successfully', 'lifecycle');
    } catch (error) {
      this.stateManager.setState(agentId, AgentState.Failed);
      this.logger.error(agentId, 'Agent initialization failed', 'lifecycle', error as Error);
      throw error;
    }
  }

  async activate(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent with id ${agentId} not found`);
    }

    const currentState = this.stateManager.getCurrentState(agentId);
    if (currentState !== AgentState.Ready) {
      throw new Error(`Cannot activate agent in state ${currentState}`);
    }

    this.stateManager.setState(agentId, AgentState.Ready);
    this.logger.info(agentId, 'Agent activated', 'lifecycle');
  }

  async execute(agentId: string, input: AgentInput, context: AgentContext): Promise<AgentOutput> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent with id ${agentId} not found`);
    }

    const currentState = this.stateManager.getCurrentState(agentId);
    if (currentState !== AgentState.Ready && currentState !== AgentState.Waiting) {
      throw new Error(`Cannot execute agent in state ${currentState}`);
    }

    this.stateManager.setState(agentId, AgentState.Running);
    this.logger.info(agentId, 'Starting execution', 'lifecycle');

    try {
      const output = await agent.execute(input, context);
      this.stateManager.setState(agentId, AgentState.Completed);
      this.logger.info(agentId, 'Execution completed successfully', 'lifecycle');
      return output;
    } catch (error) {
      this.stateManager.setState(agentId, AgentState.Failed);
      this.logger.error(agentId, 'Execution failed', 'lifecycle', error as Error);
      throw error;
    }
  }

  async pause(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent with id ${agentId} not found`);
    }

    const currentState = this.stateManager.getCurrentState(agentId);
    if (currentState !== AgentState.Running && currentState !== AgentState.Waiting) {
      throw new Error(`Cannot pause agent in state ${currentState}`);
    }

    this.stateManager.setState(agentId, AgentState.Paused);
    this.logger.info(agentId, 'Agent paused', 'lifecycle');

    try {
      await agent.pause();
    } catch (error) {
      this.logger.error(agentId, 'Failed to pause agent', 'lifecycle', error as Error);
      throw error;
    }
  }

  async resume(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent with id ${agentId} not found`);
    }

    const currentState = this.stateManager.getCurrentState(agentId);
    if (currentState !== AgentState.Paused) {
      throw new Error(`Cannot resume agent in state ${currentState}`);
    }

    this.stateManager.setState(agentId, AgentState.Running);
    this.logger.info(agentId, 'Agent resumed', 'lifecycle');

    try {
      await agent.resume();
    } catch (error) {
      this.logger.error(agentId, 'Failed to resume agent', 'lifecycle', error as Error);
      throw error;
    }
  }

  async cancel(agentId: string, taskId: string): Promise<boolean> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent with id ${agentId} not found`);
    }

    const currentState = this.stateManager.getCurrentState(agentId);
    if (currentState !== AgentState.Running && currentState !== AgentState.Waiting && currentState !== AgentState.Paused) {
      throw new Error(`Cannot cancel agent in state ${currentState}`);
    }

    this.logger.info(agentId, `Cancelling task ${taskId}`, 'lifecycle');

    try {
      const result = await agent.cancel(taskId);
      if (result) {
        this.stateManager.setState(agentId, AgentState.Cancelled);
        this.logger.info(agentId, 'Task cancelled successfully', 'lifecycle');
      }
      return result;
    } catch (error) {
      this.logger.error(agentId, 'Failed to cancel task', 'lifecycle', error as Error);
      return false;
    }
  }

  async shutdown(agentId: string): Promise<void> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent with id ${agentId} not found`);
    }

    this.logger.info(agentId, 'Shutting down agent', 'lifecycle');

    try {
      await agent.dispose();
      this.stateManager.setState(agentId, AgentState.Idle);
      this.logger.info(agentId, 'Agent shut down successfully', 'lifecycle');
    } catch (error) {
      this.logger.error(agentId, 'Failed to shutdown agent', 'lifecycle', error as Error);
      throw error;
    }
  }

  getStateManager(): AgentStateManager {
    return this.stateManager;
  }

  getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }
}
