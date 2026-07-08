import { AgentMetrics as IAgentMetrics, AgentStatus } from '@luna-ai/types';

export class AgentMetrics implements IAgentMetrics {
  agentId: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecutionTime?: Date;
  currentStatus: AgentStatus;
  activeDuration?: number;
  private executionTimes: number[];
  private startTime?: Date;

  constructor(agentId: string) {
    this.agentId = agentId;
    this.totalExecutions = 0;
    this.successfulExecutions = 0;
    this.failedExecutions = 0;
    this.averageExecutionTime = 0;
    this.currentStatus = 'idle';
    this.executionTimes = [];
  }

  recordExecution(executionTime: number, success: boolean): void {
    this.totalExecutions++;
    this.executionTimes.push(executionTime);
    
    if (success) {
      this.successfulExecutions++;
    } else {
      this.failedExecutions++;
    }

    this.lastExecutionTime = new Date();
    this.updateAverageExecutionTime();
  }

  private updateAverageExecutionTime(): void {
    if (this.executionTimes.length === 0) {
      this.averageExecutionTime = 0;
      return;
    }
    
    const sum = this.executionTimes.reduce((acc, time) => acc + time, 0);
    this.averageExecutionTime = sum / this.executionTimes.length;
  }

  setStatus(status: AgentStatus): void {
    this.currentStatus = status;
    
    if (status === 'busy' && !this.startTime) {
      this.startTime = new Date();
    } else if (status === 'idle' && this.startTime) {
      const endTime = new Date();
      this.activeDuration = (endTime.getTime() - this.startTime.getTime()) / 1000;
      this.startTime = undefined;
    }
  }

  getSuccessRate(): number {
    if (this.totalExecutions === 0) return 0;
    return (this.successfulExecutions / this.totalExecutions) * 100;
  }

  getFailureRate(): number {
    if (this.totalExecutions === 0) return 0;
    return (this.failedExecutions / this.totalExecutions) * 100;
  }

  reset(): void {
    this.totalExecutions = 0;
    this.successfulExecutions = 0;
    this.failedExecutions = 0;
    this.averageExecutionTime = 0;
    this.lastExecutionTime = undefined;
    this.currentStatus = 'idle';
    this.activeDuration = undefined;
    this.executionTimes = [];
    this.startTime = undefined;
  }

  toJSON(): IAgentMetrics {
    return {
      agentId: this.agentId,
      totalExecutions: this.totalExecutions,
      successfulExecutions: this.successfulExecutions,
      failedExecutions: this.failedExecutions,
      averageExecutionTime: this.averageExecutionTime,
      lastExecutionTime: this.lastExecutionTime,
      currentStatus: this.currentStatus,
      activeDuration: this.activeDuration,
    };
  }
}
