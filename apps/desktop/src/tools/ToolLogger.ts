import { ToolExecutionLog } from './types';

export class ToolLogger {
  private logs: ToolExecutionLog[] = [];
  private maxLogs: number = 1000;

  log(log: ToolExecutionLog): void {
    this.logs.push(log);
    
    // Prevent unbounded growth
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  getLogs(toolId?: string): ToolExecutionLog[] {
    if (toolId) {
      return this.logs.filter((log) => log.toolId === toolId);
    }
    return [...this.logs];
  }

  getRecentLogs(count: number): ToolExecutionLog[] {
    return this.logs.slice(-count);
  }

  clearLogs(): void {
   this.logs = [];
  }

  getStats(): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    approvedExecutions: number;
    deniedExecutions: number;
    averageExecutionTime: number;
  } {
    const total = this.logs.length;
    const successful = this.logs.filter((l) => l.success).length;
    const failed = total - successful;
    const approved = this.logs.filter((l) => l.approved).length;
    const denied = this.logs.filter((l) => !l.approved).length;
    const avgTime = total > 0 
      ? this.logs.reduce((sum, l) => sum + l.executionTime, 0) / total 
      : 0;

    return {
      totalExecutions: total,
      successfulExecutions: successful,
      failedExecutions: failed,
      approvedExecutions: approved,
      deniedExecutions: denied,
      averageExecutionTime: avgTime,
    };
  }
}

export const toolLogger = new ToolLogger();
