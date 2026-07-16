import {
  TaskPlan,
  Task,
  TaskState,
  TaskPriority,
  TaskType,
  AgentContext,
} from '@luna-ai/types';

export class TaskPlanner {
  async analyzeRequest(request: string, context: AgentContext): Promise<TaskPlan> {
    const tasks = await this.decomposeRequest(request, context);
    const executionOrder = this.calculateExecutionOrder(tasks);
    const requiredCapabilities = this.extractRequiredCapabilities(tasks);
    const estimatedDuration = this.estimateTotalDuration(tasks);
    const estimatedTokens = this.estimateTotalTokens(tasks);

    return {
      tasks,
      executionOrder,
      estimatedDuration,
      estimatedTokens,
      requiredCapabilities,
    };
  }

  async estimateComplexity(request: string): Promise<number> {
    const keywords = ['create', 'implement', 'build', 'refactor', 'debug', 'test', 'document', 'analyze', 'search'];
    const keywordCount = keywords.filter(keyword => request.toLowerCase().includes(keyword)).length;
    const lengthScore = Math.min(request.length / 100, 10);
    return Math.min(keywordCount * 2 + lengthScore, 10);
  }

  async decomposeTask(task: Task): Promise<Task[]> {
    const complexity = await this.estimateComplexity(task.description);
    
    // If complexity is low, return task as-is
    if (complexity < 5) {
      return [task];
    }

    // For high complexity tasks, split into subtasks
    const subtasks: Task[] = [];
    
    // Create analysis subtask
    subtasks.push(this.createSubTask(
      task,
      'analysis',
      `Analyze requirements for: ${task.title}`,
      'high',
      0
    ));

    // Create execution subtask
    subtasks.push(this.createSubTask(
      task,
      task.type,
      task.description,
      task.priority,
      1
    ));

    // Create validation subtask
    subtasks.push(this.createSubTask(
      task,
      'analysis',
      `Validate results for: ${task.title}`,
      'medium',
      2
    ));

    // Update parent task with subtask references
    task.subtaskIds = subtasks.map(st => st.id);
    
    return subtasks;
  }

  async estimateTokenUsage(task: Task): Promise<number> {
    // Base token estimation based on task type and description length
    const baseTokens: Record<TaskType, number> = {
      code_generation: 2000,
      debugging: 1500,
      testing: 1000,
      documentation: 800,
      refactoring: 1500,
      search: 500,
      analysis: 1000,
      general: 500,
    };

    const typeTokens = baseTokens[task.type] ?? baseTokens.general;
    const descriptionTokens = task.description.length * 2;
    const metadataTokens = JSON.stringify(task.metadata).length;

    return typeTokens + descriptionTokens + metadataTokens;
  }

  private async decomposeRequest(request: string, context: AgentContext): Promise<Task[]> {
    const tasks: Task[] = [];
    const complexity = await this.estimateComplexity(request);

    // Task decomposition based on request analysis
    if (request.toLowerCase().includes('create') || request.toLowerCase().includes('implement')) {
      tasks.push(this.createTask(
        'code_generation',
        'Generate code based on request',
        request,
        context,
        'high'
      ));
    }

    if (request.toLowerCase().includes('debug') || request.toLowerCase().includes('fix')) {
      tasks.push(this.createTask(
        'debugging',
        'Debug and fix issues',
        request,
        context,
        'high'
      ));
    }

    if (request.toLowerCase().includes('test')) {
      tasks.push(this.createTask(
        'testing',
        'Create or run tests',
        request,
        context,
        'medium'
      ));
    }

    if (request.toLowerCase().includes('document')) {
      tasks.push(this.createTask(
        'documentation',
        'Generate documentation',
        request,
        context,
        'medium'
      ));
    }

    if (request.toLowerCase().includes('refactor')) {
      tasks.push(this.createTask(
        'refactoring',
        'Refactor code',
        request,
        context,
        'medium'
      ));
    }

    if (request.toLowerCase().includes('search') || request.toLowerCase().includes('find')) {
      tasks.push(this.createTask(
        'search',
        'Search for information',
        request,
        context,
        'medium'
      ));
    }

    if (request.toLowerCase().includes('analyze')) {
      tasks.push(this.createTask(
        'analysis',
        'Analyze code or project',
        request,
        context,
        'medium'
      ));
    }

    // If no specific task type was identified, create a general task
    if (tasks.length === 0) {
      tasks.push(this.createTask(
        'general',
        'Process general request',
        request,
        context,
        'medium'
      ));
    }

    return tasks;
  }

  private createTask(
    type: TaskType,
    title: string,
    description: string,
    context: AgentContext,
    priority: TaskPriority
  ): Task {
    return {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      description,
      type,
      priority,
      status: TaskState.Pending,
      createdAt: new Date(),
      updatedAt: new Date(),
      timeout: 30000,
      retries: 0,
      maxRetries: 3,
      dependencies: [],
      estimatedTokens: 1000,
      input: description,
      metadata: {
        context,
      },
    };
  }

  private createSubTask(
    parentTask: Task,
    type: TaskType,
    description: string,
    priority: TaskPriority,
    index: number
  ): Task {
    return {
      id: `subtask-${parentTask.id}-${index}`,
      title: `${parentTask.title} - Step ${index + 1}`,
      description,
      type,
      priority,
      status: TaskState.Pending,
      createdAt: new Date(),
      updatedAt: new Date(),
      timeout: parentTask.timeout,
      retries: 0,
      maxRetries: parentTask.maxRetries,
      dependencies: index > 0 ? [`subtask-${parentTask.id}-${index - 1}`] : [],
      estimatedTokens: Math.floor(parentTask.estimatedTokens / 3),
      input: parentTask.input,
      metadata: {
        parentTaskId: parentTask.id,
        ...parentTask.metadata,
      },
      parentTaskId: parentTask.id,
    };
  }

  private calculateExecutionOrder(tasks: Task[]): string[] {
    // Topological sort based on dependencies
    const sorted: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (taskId: string, taskMap: Map<string, Task>) => {
      if (visited.has(taskId)) return;
      if (visiting.has(taskId)) {
        throw new Error(`Circular dependency detected for task ${taskId}`);
      }

      visiting.add(taskId);
      const task = taskMap.get(taskId);
      if (task) {
        for (const depId of task.dependencies) {
          visit(depId, taskMap);
        }
      }
      visiting.delete(taskId);
      visited.add(taskId);
      sorted.push(taskId);
    };

    const taskMap = new Map(tasks.map(t => [t.id, t]));
    
    // Sort by priority first, then apply topological sort
    const priorityOrder: Record<TaskPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    const prioritySorted = [...tasks].sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    for (const task of prioritySorted) {
      visit(task.id, taskMap);
    }

    return sorted;
  }

  private extractRequiredCapabilities(tasks: Task[]): string[] {
    const capabilities = new Set<string>();
    
    for (const task of tasks) {
      switch (task.type) {
        case 'code_generation':
          capabilities.add('code_generation');
          capabilities.add('file_write');
          break;
        case 'debugging':
          capabilities.add('code_analysis');
          capabilities.add('error_detection');
          break;
        case 'testing':
          capabilities.add('test_execution');
          capabilities.add('code_analysis');
          break;
        case 'documentation':
          capabilities.add('documentation_generation');
          capabilities.add('code_analysis');
          break;
        case 'refactoring':
          capabilities.add('code_analysis');
          capabilities.add('code_transformation');
          break;
        case 'search':
          capabilities.add('search');
          capabilities.add('file_read');
          break;
        case 'analysis':
          capabilities.add('code_analysis');
          capabilities.add('pattern_recognition');
          break;
        case 'general':
          capabilities.add('general_processing');
          break;
      }
    }

    return Array.from(capabilities);
  }

  private estimateTotalDuration(tasks: Task[]): number {
    // Simple estimation: 5 seconds per task
    return tasks.length * 5000;
  }

  private estimateTotalTokens(tasks: Task[]): number {
    let total = 0;
    for (const task of tasks) {
      total += task.estimatedTokens;
    }
    return total;
  }
}
