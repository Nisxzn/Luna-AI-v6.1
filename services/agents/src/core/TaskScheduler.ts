import { Task, TaskState, TaskSchedulerConfig } from '@luna-ai/types';

export class TaskScheduler {
  private config: TaskSchedulerConfig;
  private scheduledTasks: Map<string, Task>;
  private dependencyGraph: Map<string, string[]>;
  private isRunning: boolean;
  private executionInterval?: NodeJS.Timeout;

  constructor(config?: Partial<TaskSchedulerConfig>) {
    this.config = {
      maxConcurrentTasks: 1,
      enableDependencyResolution: true,
      enablePriorityScheduling: true,
      enableTimeoutHandling: true,
      ...config,
    };
    this.scheduledTasks = new Map();
    this.dependencyGraph = new Map();
    this.isRunning = false;
  }

  schedule(task: Task): void {
    this.scheduledTasks.set(task.id, task);
    
    // Build dependency graph
    if (task.dependencies.length > 0) {
      this.dependencyGraph.set(task.id, [...task.dependencies]);
    }
  }

  unschedule(taskId: string): boolean {
    this.dependencyGraph.delete(taskId);
    return this.scheduledTasks.delete(taskId);
  }

  async executeNext(
    executor: (task: Task) => Promise<void>
  ): Promise<Task | null> {
    const task = this.getNextTask();
    if (!task) {
      return null;
    }

    await executor(task);
    return task;
  }

  start(
    executor: (task: Task) => Promise<void>
  ): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.executionInterval = setInterval(async () => {
      const task = this.getNextTask();
      if (task) {
        try {
          await executor(task);
        } catch (error) {
          console.error(`Error executing task ${task.id}:`, error);
        }
      }
    }, 100);
  }

  stop(): void {
    if (this.executionInterval) {
      clearInterval(this.executionInterval);
      this.executionInterval = undefined;
    }
    this.isRunning = false;
  }

  getNextTask(): Task | null {
    if (this.scheduledTasks.size === 0) {
      return null;
    }

    const tasks = Array.from(this.scheduledTasks.values());
    
    // Filter tasks that are ready to execute
    const readyTasks = tasks.filter(task => {
      if (task.status !== TaskState.Pending && task.status !== TaskState.Queued) {
        return false;
      }

      if (this.config.enableDependencyResolution) {
        return this.areDependenciesSatisfied(task);
      }

      return true;
    });

    if (readyTasks.length === 0) {
      return null;
    }

    // Sort by priority if enabled
    if (this.config.enablePriorityScheduling) {
      readyTasks.sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
    }

    return readyTasks[0];
  }

  areDependenciesSatisfied(task: Task): boolean {
    const dependencies = this.dependencyGraph.get(task.id) || [];
    
    for (const depId of dependencies) {
      const depTask = this.scheduledTasks.get(depId);
      if (!depTask) {
        // Dependency not found, consider it satisfied
        continue;
      }

      // Dependency is not completed
      if (depTask.status !== TaskState.Completed) {
        return false;
      }
    }

    return true;
  }

  getPendingTasks(): Task[] {
    return Array.from(this.scheduledTasks.values()).filter(
      task => task.status === TaskState.Pending || task.status === TaskState.Queued
    );
  }

  getRunningTasks(): Task[] {
    return Array.from(this.scheduledTasks.values()).filter(
      task => task.status === TaskState.Running
    );
  }

  getCompletedTasks(): Task[] {
    return Array.from(this.scheduledTasks.values()).filter(
      task => task.status === TaskState.Completed
    );
  }

  getFailedTasks(): Task[] {
    return Array.from(this.scheduledTasks.values()).filter(
      task => task.status === TaskState.Failed
    );
  }

  updateTaskStatus(taskId: string, status: TaskState): void {
    const task = this.scheduledTasks.get(taskId);
    if (task) {
      task.status = status;
      task.updatedAt = new Date();
      
      if (status === TaskState.Completed) {
        task.completedAt = new Date();
      }
      
      this.scheduledTasks.set(taskId, task);
    }
  }

  clear(): void {
    this.scheduledTasks.clear();
    this.dependencyGraph.clear();
  }

  getConfig(): TaskSchedulerConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<TaskSchedulerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getDependencyGraph(): Map<string, string[]> {
    return new Map(this.dependencyGraph);
  }

  hasCircularDependencies(): boolean {
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (taskId: string): boolean => {
      if (visited.has(taskId)) return false;
      if (visiting.has(taskId)) return true;

      visiting.add(taskId);
      const dependencies = this.dependencyGraph.get(taskId) || [];
      
      for (const depId of dependencies) {
        if (visit(depId)) {
          return true;
        }
      }

      visiting.delete(taskId);
      visited.add(taskId);
      return false;
    };

    for (const taskId of this.scheduledTasks.keys()) {
      if (visit(taskId)) {
        return true;
      }
    }

    return false;
  }
}
