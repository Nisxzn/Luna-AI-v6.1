import {
  TaskPlanner as ITaskPlanner,
  TaskPlan,
  Task,
  AgentContext,
  TaskPriority,
  TaskStatus,
} from '@luna-ai/types';

export class TaskPlanner implements ITaskPlanner {
  async analyzeRequest(request: string, context: AgentContext): Promise<TaskPlan> {
    const tasks = await this.decomposeRequest(request, context);
    const executionOrder = this.calculateExecutionOrder(tasks);
    const requiredAgents = this.extractRequiredAgents(tasks);
    const estimatedDuration = this.estimateTotalDuration(tasks);

    return {
      tasks,
      executionOrder,
      requiredAgents,
      estimatedDuration,
    };
  }

  async estimateComplexity(request: string): Promise<number> {
    // Simple heuristic based on request length and keywords
    const keywords = ['create', 'implement', 'build', 'refactor', 'debug', 'test', 'document'];
    const keywordCount = keywords.filter(keyword => request.toLowerCase().includes(keyword)).length;
    const lengthScore = Math.min(request.length / 100, 10);
    return Math.min(keywordCount * 2 + lengthScore, 10);
  }

  async decomposeTask(task: Task): Promise<Task[]> {
    // For now, return the task as-is. In a real implementation,
    // this would analyze the task and break it down into subtasks
    return [task];
  }

  private async decomposeRequest(request: string, context: AgentContext): Promise<Task[]> {
    const tasks: Task[] = [];
    const complexity = await this.estimateComplexity(request);

    // Simple task decomposition based on request analysis
    if (request.toLowerCase().includes('create') || request.toLowerCase().includes('implement')) {
      tasks.push(this.createTask('code_generation', 'Generate code based on request', request, context, 'high'));
    }

    if (request.toLowerCase().includes('debug') || request.toLowerCase().includes('fix')) {
      tasks.push(this.createTask('debugging', 'Debug and fix issues', request, context, 'high'));
    }

    if (request.toLowerCase().includes('test')) {
      tasks.push(this.createTask('testing', 'Create or run tests', request, context, 'medium'));
    }

    if (request.toLowerCase().includes('document')) {
      tasks.push(this.createTask('documentation', 'Generate documentation', request, context, 'medium'));
    }

    if (request.toLowerCase().includes('refactor')) {
      tasks.push(this.createTask('refactoring', 'Refactor code', request, context, 'medium'));
    }

    if (request.toLowerCase().includes('search') || request.toLowerCase().includes('find')) {
      tasks.push(this.createTask('search', 'Search for information', request, context, 'medium'));
    }

    if (request.toLowerCase().includes('analyze')) {
      tasks.push(this.createTask('analysis', 'Analyze code or project', request, context, 'medium'));
    }

    // If no specific task type was identified, create a general task
    if (tasks.length === 0) {
      tasks.push(this.createTask('general', 'Process general request', request, context, 'medium'));
    }

    return tasks;
  }

  private createTask(
    type: string,
    description: string,
    request: string,
    context: AgentContext,
    priority: TaskPriority
  ): Task {
    return {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      description,
      priority,
      status: 'pending',
      input: {
        type,
        data: request,
      },
      context,
      createdAt: new Date(),
      updatedAt: new Date(),
      retryCount: 0,
      maxRetries: 3,
      timeout: 30000, // 30 seconds default
    };
  }

  private calculateExecutionOrder(tasks: Task[]): string[] {
    // Sort by priority and dependencies
    const sorted = [...tasks].sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
    return sorted.map(task => task.id);
  }

  private extractRequiredAgents(tasks: Task[]): string[] {
    // In a real implementation, this would map task types to agent IDs
    // For now, return empty array - agent selection is done by the router
    return [];
  }

  private estimateTotalDuration(tasks: Task[]): number {
    // Simple estimation: 5 seconds per task
    return tasks.length * 5000;
  }
}
