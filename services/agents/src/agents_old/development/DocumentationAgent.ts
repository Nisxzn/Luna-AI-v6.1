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

export class DocumentationAgent extends BaseAgent {
  constructor(logger: AgentLogger) {
    const capabilities: AgentCapability[] = [
      {
        name: 'documentation_generation',
        description: 'Generate documentation from code',
        inputTypes: ['documentation', 'document'],
        outputTypes: ['documentation', 'markdown'],
      },
      {
        name: 'api_docs',
        description: 'Generate API documentation',
        inputTypes: ['api_docs', 'api_documentation'],
        outputTypes: ['api_docs', 'openapi_spec'],
      },
      {
        name: 'readme_generation',
        description: 'Generate README files',
        inputTypes: ['readme', 'readme_generation'],
        outputTypes: ['markdown', 'readme'],
      },
    ];

    const config: AgentConfig = {
      id: 'documentation-agent',
      name: 'Documentation Agent',
      description: 'Specialized agent for documentation generation',
      category: 'development',
      capabilities,
      supportedTools: ['file_read', 'file_write', 'code_analyze'],
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

      // Simulate documentation generation logic
      const result = await this.generateDocumentation(request, context);

      this.setStatus('idle');
      return this.createOutput('documentation', result, true);
    } catch (error) {
      this.setStatus('error');
      this.logger.error(this.id, 'Execution failed', error as Error);
      return this.createOutput('error', null, false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async generateDocumentation(request: string, context: AgentContext): Promise<string> {
    // Placeholder implementation
    return `# Documentation for: ${request}\n\nContext: ${context.workspaceId || 'global'}\n\n## Overview\n\nDocumentation content would go here`;
  }
}
