import {
  BaseAgent,
  AgentConfig,
  AgentInput,
  AgentOutput,
  AgentContext,
  AgentState,
  AgentCategory,
  TaskPriority,
  AgentCapability,
} from '@luna-ai/types';

export class DebuggingAgent implements BaseAgent {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly category: AgentCategory;
  readonly capabilities: AgentCapability[];
  readonly supportedTools: string[];
  readonly supportedModels: string[];
  readonly status: AgentState;
  readonly priority: TaskPriority;
  private config: AgentConfig;
  private initialized: boolean;
  private paused: boolean;
  private disposed: boolean;

  constructor(config: AgentConfig) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.version = '1.0.0';
    this.category = config.category;
    this.capabilities = config.capabilities;
    this.supportedTools = config.supportedTools;
    this.supportedModels = ['gpt-4', 'claude-3-opus'];
    this.status = AgentState.Idle;
    this.priority = 'high';
    this.config = config;
    this.initialized = false;
    this.paused = false;
    this.disposed = false;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      throw new Error('DebuggingAgent already initialized');
    }
    this.initialized = true;
  }

  async execute(input: AgentInput, context: AgentContext): Promise<AgentOutput> {
    if (!this.initialized) {
      throw new Error('DebuggingAgent not initialized');
    }
    if (this.paused) {
      throw new Error('DebuggingAgent is paused');
    }
    if (this.disposed) {
      throw new Error('DebuggingAgent is disposed');
    }

    // Mock implementation
    return {
      type: 'debugging',
      data: {
        diagnosis: 'Debug diagnosis (mock)',
        fix: 'Suggested fix (mock)',
        input: input.data,
        context: context.workspaceId,
      },
      success: true,
      metadata: { agentId: this.id },
    };
  }

  async pause(): Promise<void> {
    if (!this.initialized) {
      throw new Error('DebuggingAgent not initialized');
    }
    this.paused = true;
  }

  async resume(): Promise<void> {
    if (!this.initialized) {
      throw new Error('DebuggingAgent not initialized');
    }
    if (!this.paused) {
      throw new Error('DebuggingAgent is not paused');
    }
    this.paused = false;
  }

  async cancel(taskId: string): Promise<boolean> {
    if (this.disposed) {
      return false;
    }
    return true;
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    this.initialized = false;
    this.paused = false;
  }

  async validate(input: AgentInput): Promise<boolean> {
    return input.type === 'debugging' && input.data !== null;
  }

  getStatus(): AgentState {
    if (this.disposed) return AgentState.Cancelled;
    if (this.paused) return AgentState.Paused;
    if (!this.initialized) return AgentState.Idle;
    return AgentState.Ready;
  }

  getConfig(): AgentConfig {
    return this.config;
  }
}
