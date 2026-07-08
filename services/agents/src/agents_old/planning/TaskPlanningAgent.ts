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

export class TaskPlanningAgent extends BaseAgent {
  constructor(logger: AgentLogger) {
    const capabilities: AgentCapability[] = [
      {
        name: 'task_decomposition',
        description: 'Decompose complex tasks into subtasks',
        inputTypes: ['task_planning', 'decompose_task', 'plan_task'],
        outputTypes: ['task_plan', 'subtasks'],
      },
      {
        name: 'dependency_analysis',
        description: 'Analyze task dependencies',
        inputTypes: ['dependency_analysis', 'analyze_dependencies'],
        outputTypes: ['dependency_graph', 'execution_order'],
      },
      {
        name: 'resource_estimation',
        description: 'Estimate required resources and time',
        inputTypes: ['resource_estimation', 'estimate_resources'],
        outputTypes: ['estimates', 'resource_plan'],
      },
    ];

    const config: AgentConfig = {
      id: 'task-planning-agent',
      name: 'Task Planning Agent',
      description: 'Specialized agent for task planning and decomposition',
      category: 'planning',
      capabilities,
      supportedTools: ['task_analyze', 'dependency_tracker'],
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

      // Simulate task planning logic
      const result = await this.planTask(request, context);

      this.setStatus('idle');
      return this.createOutput('task_plan', result, true);
    } catch (error) {
      this.setStatus('error');
      this.logger.error(this.id, 'Execution failed', error as Error);
      return this.createOutput('error', null, false, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async planTask(request: string, context: AgentContext): Promise<string> {
    // Placeholder implementation
    return `Task plan for: ${request}\nContext: ${context.workspaceId || 'global'}`;
  }
}
