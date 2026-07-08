// Phase 6.1: Framework only - specialized agents will be updated in future phases
// This old BaseAgent implementation doesn't match the new interface
// Will be updated when implementing specialized agents

/*
import {
  BaseAgent as IBaseAgent,
  AgentInput,
  AgentOutput,
  AgentContext,
  AgentConfig,
  AgentCapability,
  AgentStatus,
} from '@luna-ai/types';
import { AgentLogger } from '../core/AgentLogger';

export abstract class BaseAgent implements IBaseAgent {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly capabilities: AgentCapability[];
  readonly supportedTools: string[];
  
  public config: AgentConfig;
  protected logger: AgentLogger;
  protected currentStatus: AgentStatus;
  protected activeTasks: Set<string>;

  constructor(config: AgentConfig, logger: AgentLogger) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.capabilities = config.capabilities;
    this.supportedTools = config.supportedTools;
    this.config = config;
    this.logger = logger;
    this.currentStatus = 'idle';
    this.activeTasks = new Set();
  }

  abstract execute(input: AgentInput, context: AgentContext): Promise<AgentOutput>;

  async validate(input: AgentInput): Promise<boolean> {
    // Check if input type is supported
    const isTypeSupported = this.capabilities.some(cap => 
      cap.inputTypes.includes(input.type)
    );

    if (!isTypeSupported) {
      this.logger.warn(this.id, `Input type ${input.type} not supported`, 'validation');
      return false;
    }

    return true;
  }

  async cancel(taskId: string): Promise<boolean> {
    if (this.activeTasks.has(taskId)) {
      this.activeTasks.delete(taskId);
      this.logger.info(this.id, `Task ${taskId} cancelled`, 'cancellation');
      return true;
    }
    return false;
  }

  getStatus(): AgentStatus {
    return this.currentStatus;
  }

  getConfig(): AgentConfig {
    return { ...this.config };
  }

  protected setStatus(status: AgentStatus): void {
    this.currentStatus = status;
    this.logger.debug(this.id, `Status changed to ${status}`, 'status_change');
  }

  protected addActiveTask(taskId: string): void {
    this.activeTasks.add(taskId);
  }

  protected removeActiveTask(taskId: string): void {
    this.activeTasks.delete(taskId);
  }

  protected createOutput(
    type: string,
    data: unknown,
    success: boolean = true,
    error?: string,
    metadata?: Record<string, unknown>
  ): AgentOutput {
    return {
      type,
      data,
      success,
      error,
      metadata,
    };
  }
}
*/
