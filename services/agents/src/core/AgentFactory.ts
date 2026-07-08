import {
  BaseAgent,
  AgentConfig,
  AgentFactory as IAgentFactory,
} from '@luna-ai/types';
import { AgentLogger } from './AgentLogger';

export class AgentFactory implements IAgentFactory {
  private agentTypes: Map<string, new (config: AgentConfig) => BaseAgent>;
  private logger: AgentLogger;

  constructor(logger: AgentLogger) {
    this.agentTypes = new Map();
    this.logger = logger;
  }

  createAgent(config: AgentConfig): BaseAgent {
    const AgentClass = this.agentTypes.get(config.category);
    
    if (!AgentClass) {
      throw new Error(`No agent type registered for category: ${config.category}`);
    }

    try {
      const agent = new AgentClass(config);
      this.logger.info(config.id, `Agent created with type ${config.category}`, 'factory');
      return agent;
    } catch (error) {
      this.logger.error(config.id, `Failed to create agent`, 'factory', error as Error);
      throw error;
    }
  }

  createAgentFromType(type: string, config: AgentConfig): BaseAgent {
    const AgentClass = this.agentTypes.get(type);
    
    if (!AgentClass) {
      throw new Error(`No agent type registered for: ${type}`);
    }

    try {
      const agent = new AgentClass(config);
      this.logger.info(config.id, `Agent created with type ${type}`, 'factory');
      return agent;
    } catch (error) {
      this.logger.error(config.id, `Failed to create agent from type ${type}`, 'factory', error as Error);
      throw error;
    }
  }

  registerAgentType(type: string, constructor: new (config: AgentConfig) => BaseAgent): void {
    if (this.agentTypes.has(type)) {
      this.logger.warn('factory', `Agent type ${type} is already registered, overwriting`, 'factory');
    }
    
    this.agentTypes.set(type, constructor);
    this.logger.info('factory', `Agent type ${type} registered`, 'factory');
  }

  getAvailableTypes(): string[] {
    return Array.from(this.agentTypes.keys());
  }

  hasType(type: string): boolean {
    return this.agentTypes.has(type);
  }

  unregisterAgentType(type: string): boolean {
    const result = this.agentTypes.delete(type);
    if (result) {
      this.logger.info('factory', `Agent type ${type} unregistered`, 'factory');
    }
    return result;
  }

  clear(): void {
    this.agentTypes.clear();
    this.logger.info('factory', 'All agent types cleared', 'factory');
  }
}
