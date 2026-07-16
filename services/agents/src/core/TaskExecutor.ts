import {
  Task,
  TaskState,
  TaskExecutionResult,
  DEFAULT_RETRY_POLICY,
  DEFAULT_TIMEOUT_POLICY,
} from '@luna-ai/types';

export class TaskExecutor {
  private retryPolicy: typeof DEFAULT_RETRY_POLICY;
  private timeoutPolicy: typeof DEFAULT_TIMEOUT_POLICY;
  private activeExecutions: Map<string, AbortController>;

  constructor(
    retryPolicy?: Partial<typeof DEFAULT_RETRY_POLICY>,
    timeoutPolicy?: Partial<typeof DEFAULT_TIMEOUT_POLICY>
  ) {
    this.retryPolicy = { ...DEFAULT_RETRY_POLICY, ...retryPolicy };
    this.timeoutPolicy = { ...DEFAULT_TIMEOUT_POLICY, ...timeoutPolicy };
    this.activeExecutions = new Map();
  }

  async execute(
    task: Task,
    executor: () => Promise<unknown>
  ): Promise<TaskExecutionResult> {
    const startTime = Date.now();
    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt <= this.retryPolicy.maxRetries) {
      attempt++;
      task.retries = attempt - 1;

      try {
        const result = await this.executeWithTimeout(task, executor);
        const executionTime = Date.now() - startTime;

        return {
          taskId: task.id,
          success: true,
          output: result,
          executionTime,
          tokensUsed: task.estimatedTokens,
          timestamp: new Date(),
        };
      } catch (error) {
        lastError = error as Error;
        
        if (!this.shouldRetry(error as Error, attempt)) {
          break;
        }

        if (attempt < this.retryPolicy.maxRetries) {
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay);
        }
      }
    }

    const executionTime = Date.now() - startTime;
    return {
      taskId: task.id,
      success: false,
      error: lastError?.message || 'Unknown error',
      executionTime,
      tokensUsed: 0,
      timestamp: new Date(),
    };
  }

  async executeWithTimeout<T>(
    task: Task,
    executor: () => Promise<T>
  ): Promise<T> {
    const timeout = this.getTimeout(task);
    const controller = new AbortController();
    this.activeExecutions.set(task.id, controller);

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        controller.abort();
        reject(new Error(`Task execution timeout after ${timeout}ms`));
      }, timeout);
    });

    try {
      return await Promise.race([executor(), timeoutPromise]);
    } finally {
      this.activeExecutions.delete(task.id);
    }
  }

  cancelTask(taskId: string): boolean {
    const controller = this.activeExecutions.get(taskId);
    if (controller) {
      controller.abort();
      this.activeExecutions.delete(taskId);
      return true;
    }
    return false;
  }

  getActiveExecutions(): string[] {
    return Array.from(this.activeExecutions.keys());
  }

  private shouldRetry(error: Error, attempt: number): boolean {
    if (attempt >= this.retryPolicy.maxRetries) {
      return false;
    }

    const errorMessage = error.message;
    return this.retryPolicy.retryableErrors.some(retryableError =>
      errorMessage.includes(retryableError)
    );
  }

  private calculateRetryDelay(attempt: number): number {
    const delay = this.retryPolicy.initialDelay * Math.pow(this.retryPolicy.backoffMultiplier, attempt - 1);
    return Math.min(delay, this.retryPolicy.maxDelay);
  }

  private getTimeout(task: Task): number {
    const typeTimeout = this.timeoutPolicy.timeoutPerType[task.type] || this.timeoutPolicy.defaultTimeout;
    return Math.min(typeTimeout, this.timeoutPolicy.maxTimeout);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  updateRetryPolicy(policy: Partial<typeof DEFAULT_RETRY_POLICY>): void {
    this.retryPolicy = { ...this.retryPolicy, ...policy };
  }

  updateTimeoutPolicy(policy: Partial<typeof DEFAULT_TIMEOUT_POLICY>): void {
    this.timeoutPolicy = { ...this.timeoutPolicy, ...policy };
  }

  getRetryPolicy(): typeof DEFAULT_RETRY_POLICY {
    return { ...this.retryPolicy };
  }

  getTimeoutPolicy(): typeof DEFAULT_TIMEOUT_POLICY {
    return { ...this.timeoutPolicy };
  }
}
