import { Task, TaskState, TaskPriority, TaskType, TaskMetrics as TaskMetricsType } from '@luna-ai/types';

export class TaskMetrics {
  private metrics: TaskMetricsType;
  private taskExecutionTimes: Map<string, number>;
  private taskStartTimes: Map<string, number>;

  constructor() {
    this.metrics = {
      totalTasks: 0,
      successfulTasks: 0,
      failedTasks: 0,
      cancelledTasks: 0,
      timeoutTasks: 0,
      successRate: 0,
      failureRate: 0,
      averageExecutionTime: 0,
      queueSize: 0,
      agentUtilization: {},
      tasksByType: {
        code_generation: 0,
        debugging: 0,
        testing: 0,
        documentation: 0,
        refactoring: 0,
        search: 0,
        analysis: 0,
        general: 0,
      },
      tasksByPriority: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
    };
    this.taskExecutionTimes = new Map();
    this.taskStartTimes = new Map();
  }

  recordTaskCreated(task: Task): void {
    this.metrics.totalTasks++;
    this.metrics.tasksByType[task.type]++;
    this.metrics.tasksByPriority[task.priority]++;
    this.taskStartTimes.set(task.id, Date.now());
  }

  recordTaskCompleted(task: Task, success: boolean): void {
    const startTime = this.taskStartTimes.get(task.id);
    const executionTime = startTime ? Date.now() - startTime : 0;
    
    this.taskExecutionTimes.set(task.id, executionTime);
    
    if (success) {
      this.metrics.successfulTasks++;
    } else {
      this.metrics.failedTasks++;
    }

    this.updateRates();
    this.updateAverageExecutionTime();
  }

  recordTaskCancelled(task: Task): void {
    this.metrics.cancelledTasks++;
    this.updateRates();
  }

  recordTaskTimeout(task: Task): void {
    this.metrics.timeoutTasks++;
    this.updateRates();
  }

  recordQueueSize(size: number): void {
    this.metrics.queueSize = size;
  }

  recordAgentUtilization(agentId: string, utilization: number): void {
    this.metrics.agentUtilization[agentId] = utilization;
  }

  getMetrics(): TaskMetricsType {
    return { ...this.metrics };
  }

  getTaskExecutionTime(taskId: string): number | null {
    return this.taskExecutionTimes.get(taskId) || null;
  }

  getAverageExecutionTime(): number {
    return this.metrics.averageExecutionTime;
  }

  getSuccessRate(): number {
    return this.metrics.successRate;
  }

  getFailureRate(): number {
    return this.metrics.failureRate;
  }

  getTasksByType(): Record<TaskType, number> {
    return { ...this.metrics.tasksByType };
  }

  getTasksByPriority(): Record<TaskPriority, number> {
    return { ...this.metrics.tasksByPriority };
  }

  getAgentUtilization(): Record<string, number> {
    return { ...this.metrics.agentUtilization };
  }

  reset(): void {
    this.metrics = {
      totalTasks: 0,
      successfulTasks: 0,
      failedTasks: 0,
      cancelledTasks: 0,
      timeoutTasks: 0,
      successRate: 0,
      failureRate: 0,
      averageExecutionTime: 0,
      queueSize: 0,
      agentUtilization: {},
      tasksByType: {
        code_generation: 0,
        debugging: 0,
        testing: 0,
        documentation: 0,
        refactoring: 0,
        search: 0,
        analysis: 0,
        general: 0,
      },
      tasksByPriority: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
    };
    this.taskExecutionTimes.clear();
    this.taskStartTimes.clear();
  }

  private updateRates(): void {
    const completedTasks = this.metrics.successfulTasks + this.metrics.failedTasks;
    if (completedTasks > 0) {
      this.metrics.successRate = this.metrics.successfulTasks / completedTasks;
      this.metrics.failureRate = this.metrics.failedTasks / completedTasks;
    }
  }

  private updateAverageExecutionTime(): void {
    const executionTimes = Array.from(this.taskExecutionTimes.values());
    if (executionTimes.length === 0) {
      this.metrics.averageExecutionTime = 0;
      return;
    }

    const total = executionTimes.reduce((sum, time) => sum + time, 0);
    this.metrics.averageExecutionTime = total / executionTimes.length;
  }

  getMetricsSummary(): string {
    return `
Task Metrics Summary:
- Total Tasks: ${this.metrics.totalTasks}
- Successful: ${this.metrics.successfulTasks}
- Failed: ${this.metrics.failedTasks}
- Cancelled: ${this.metrics.cancelledTasks}
- Timeout: ${this.metrics.timeoutTasks}
- Success Rate: ${(this.metrics.successRate * 100).toFixed(2)}%
- Failure Rate: ${(this.metrics.failureRate * 100).toFixed(2)}%
- Average Execution Time: ${this.metrics.averageExecutionTime.toFixed(2)}ms
- Queue Size: ${this.metrics.queueSize}
- Tasks by Type: ${JSON.stringify(this.metrics.tasksByType)}
- Tasks by Priority: ${JSON.stringify(this.metrics.tasksByPriority)}
- Agent Utilization: ${JSON.stringify(this.metrics.agentUtilization)}
    `.trim();
  }
}
