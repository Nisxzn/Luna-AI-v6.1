import { TaskLogEntry, TaskState } from '@luna-ai/types';

export class TaskLogger {
  private logs: TaskLogEntry[];
  private maxLogs: number;

  constructor(maxLogs: number = 10000) {
    this.logs = [];
    this.maxLogs = maxLogs;
  }

  info(taskId: string, message: string, metadata?: Record<string, unknown>): void {
    this.addLog({
      timestamp: new Date(),
      taskId,
      level: 'info',
      message,
      metadata,
    });
  }

  warn(taskId: string, message: string, metadata?: Record<string, unknown>): void {
    this.addLog({
      timestamp: new Date(),
      taskId,
      level: 'warn',
      message,
      metadata,
    });
  }

  error(taskId: string, message: string, error?: Error, metadata?: Record<string, unknown>): void {
    this.addLog({
      timestamp: new Date(),
      taskId,
      level: 'error',
      message,
      error: error?.message,
      metadata,
    });
  }

  debug(taskId: string, message: string, metadata?: Record<string, unknown>): void {
    this.addLog({
      timestamp: new Date(),
      taskId,
      level: 'debug',
      message,
      metadata,
    });
  }

  logTaskStateChange(
    taskId: string,
    fromState: TaskState,
    toState: TaskState,
    assignedAgent?: string
  ): void {
    this.addLog({
      timestamp: new Date(),
      taskId,
      level: 'info',
      message: `Task state changed from ${fromState} to ${toState}`,
      status: toState,
      assignedAgent,
      metadata: { fromState },
    });
  }

  logTaskExecution(
    taskId: string,
    status: TaskState,
    assignedAgent: string,
    executionDuration: number
  ): void {
    this.addLog({
      timestamp: new Date(),
      taskId,
      level: 'info',
      message: `Task execution ${status}`,
      status,
      assignedAgent,
      executionDuration,
    });
  }

  logTaskError(
    taskId: string,
    error: string,
    assignedAgent?: string,
    executionDuration?: number
  ): void {
    this.addLog({
      timestamp: new Date(),
      taskId,
      level: 'error',
      message: `Task execution failed`,
      status: TaskState.Failed,
      assignedAgent,
      executionDuration,
      error,
    });
  }

  getLogs(taskId?: string): TaskLogEntry[] {
    if (taskId) {
      return this.logs.filter(log => log.taskId === taskId);
    }
    return [...this.logs];
  }

  getLogsByLevel(level: TaskLogEntry['level']): TaskLogEntry[] {
    return this.logs.filter(log => log.level === level);
  }

  getLogsByTaskId(taskId: string): TaskLogEntry[] {
    return this.logs.filter(log => log.taskId === taskId);
  }

  getLogsByTimeRange(start: Date, end: Date): TaskLogEntry[] {
    return this.logs.filter(
      log => log.timestamp >= start && log.timestamp <= end
    );
  }

  getRecentLogs(count: number): TaskLogEntry[] {
    return this.logs.slice(-count);
  }

  clearLogs(taskId?: string): void {
    if (taskId) {
      this.logs = this.logs.filter(log => log.taskId !== taskId);
    } else {
      this.logs = [];
    }
  }

  private addLog(entry: TaskLogEntry): void {
    this.logs.push(entry);

    // Maintain max log limit
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  getLogCount(): number {
    return this.logs.length;
  }

  getLogCountByTask(taskId: string): number {
    return this.logs.filter(log => log.taskId === taskId).length;
  }

  exportLogs(): TaskLogEntry[] {
    return [...this.logs];
  }

  exportLogsByTask(taskId: string): TaskLogEntry[] {
    return this.getLogsByTaskId(taskId);
  }
}
