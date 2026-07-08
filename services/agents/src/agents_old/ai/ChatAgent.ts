import { BaseAgent } from '../BaseAgent';
import {
  AgentInput,
  AgentOutput,
  AgentContext,
  AgentConfig,
  AgentCapability,
  AgentCategory,
} from '@luna-ai/types';
import { AgentLogger } from '../../core/AgentLogger';

export class ChatAgent extends BaseAgent {
  constructor(logger: AgentLogger) {
    const capabilities: AgentCapability[] = [
      {
        name: 'conversation',
        description: 'Engage in conversational interactions',
        inputTypes: ['chat', 'conversation', 'message'],
        outputTypes: ['text', 'response'],
      },
      {
        name: 'question_answering',
        description: 'Answer questions based on context',
        inputTypes: ['question', 'qa'],
        outputTypes: ['answer', 'explanation'],
      },
      {
        name: 'summarization',
        description: 'Summarize text and conversations',
        inputTypes: ['summarization', 'summarize'],
        outputTypes: ['summary', 'text'],
      },
    ];

    const config: AgentConfig = {
      id: 'chat-agent',
      name: 'Chat Agent',
      description: 'Specialized agent for conversational AI interactions',
      category: 'ai',
      capabilities,
      supportedTools: ['chat', 'memory_retrieve'],
      maxRetries: 3,
      timeout: 30000,
      enabled: true,
    };

    super(config, logger);
  }

  async execute(input: AgentInput, context: AgentContext): Promise<AgentOutput> {
    this.setStatus('busy');
    this.logger.info(this.id, `Executing ${input.type} task`);

    try {
      const request = input.data as string;

      // Simulate chat logic
      const result = await this.processChat(request, context);

      this.setStatus('idle');
      return this.createOutput('response', result, true);
    } catch (error) {
      this.setStatus('error');
      this.logger.error(this.id, 'Execution failed', error as Error);
      return this.createOutput('error', null, false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async processChat(request: string, context: AgentContext): Promise<string> {
    // Placeholder implementation
    return `Chat response for: ${request}\nContext: ${context.workspaceId || 'global'}`;
  }
}
