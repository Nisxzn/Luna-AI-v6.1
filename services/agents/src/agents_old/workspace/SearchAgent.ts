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

export class SearchAgent extends BaseAgent {
  constructor(logger: AgentLogger) {
    const capabilities: AgentCapability[] = [
      {
        name: 'code_search',
        description: 'Search for code patterns and snippets',
        inputTypes: ['search', 'code_search', 'find'],
        outputTypes: ['search_results', 'code_matches'],
      },
      {
        name: 'text_search',
        description: 'Search for text in files',
        inputTypes: ['text_search', 'grep'],
        outputTypes: ['search_results', 'matches'],
      },
      {
        name: 'semantic_search',
        description: 'Perform semantic search using embeddings',
        inputTypes: ['semantic_search', 'vector_search'],
        outputTypes: ['search_results', 'relevant_content'],
      },
    ];

    const config: AgentConfig = {
      id: 'search-agent',
      name: 'Search Agent',
      description: 'Specialized agent for searching code and text',
      category: 'workspace',
      capabilities,
      supportedTools: ['search', 'grep', 'rag_search'],
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

      // Simulate search logic
      const result = await this.performSearch(request, context);

      this.setStatus('idle');
      return this.createOutput('search_results', result, true);
    } catch (error) {
      this.setStatus('error');
      this.logger.error(this.id, 'Execution failed', error as Error);
      return this.createOutput('error', null, false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async performSearch(request: string, context: AgentContext): Promise<string> {
    // Placeholder implementation
    return `Search results for: ${request}\nContext: ${context.workspaceId || 'global'}`;
  }
}
