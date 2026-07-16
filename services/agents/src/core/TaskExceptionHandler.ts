import { Task, TaskState } from '@luna-ai/types';

export class TaskExceptionHandler {
  private errorHandlers: Map<string, ErrorHandler>;
  private errorHistory: Map<string, ErrorRecord[]>;

  constructor() {
    this.errorHandlers = new Map();
    this.errorHistory = new Map();
  }

  registerHandler(errorType: string, handler: ErrorHandler): void {
    this.errorHandlers.set(errorType, handler);
  }

  unregisterHandler(errorType: string): void {
    this.errorHandlers.delete(errorType);
  }

  async handle(error: Error, taskId: string, context?: unknown): Promise<ErrorHandlingResult> {
    const errorType = this.getErrorType(error);
    const handler = this.errorHandlers.get(errorType);

    // Record error in history
    this.recordError(taskId, error, errorType);

    if (handler) {
      try {
        return await handler(error, taskId, context);
      } catch (handlerError) {
        console.error(`Error handler failed for ${errorType}:`, handlerError);
        return {
          handled: false,
          action: 'fail',
          error: handlerError instanceof Error ? handlerError.message : String(handlerError),
        };
      }
    }

    // Default handling
    return this.defaultErrorHandler(error, taskId, context);
  }

  private defaultErrorHandler(error: Error, taskId: string, context?: unknown): ErrorHandlingResult {
    const errorMessage = error.message.toLowerCase();

    // Timeout errors
    if (errorMessage.includes('timeout')) {
      return {
        handled: true,
        action: 'retry',
        error: error.message,
      };
    }

    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
      return {
        handled: true,
        action: 'retry',
        error: error.message,
      };
    }

    // Permission errors
    if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
      return {
        handled: true,
        action: 'fail',
        error: error.message,
      };
    }

    // Validation errors
    if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
      return {
        handled: true,
        action: 'fail',
        error: error.message,
      };
    }

    // Default: fail
    return {
      handled: false,
      action: 'fail',
      error: error.message,
    };
  }

  private getErrorType(error: Error): string {
    const errorMessage = error.message.toLowerCase();

    if (errorMessage.includes('timeout')) return 'TimeoutError';
    if (errorMessage.includes('network')) return 'NetworkError';
    if (errorMessage.includes('permission')) return 'PermissionError';
    if (errorMessage.includes('validation')) return 'ValidationError';
    if (errorMessage.includes('rate limit')) return 'RateLimitError';
    if (errorMessage.includes('not found')) return 'NotFoundError';
    if (errorMessage.includes('circular')) return 'CircularDependencyError';

    return 'GenericError';
  }

  private recordError(taskId: string, error: Error, errorType: string): void {
    const record: ErrorRecord = {
      taskId,
      error: error.message,
      errorType,
      timestamp: new Date(),
    };

    const history = this.errorHistory.get(taskId) || [];
    history.push(record);
    this.errorHistory.set(taskId, history);
  }

  getErrorHistory(taskId: string): ErrorRecord[] {
    return this.errorHistory.get(taskId) || [];
  }

  getLastError(taskId: string): ErrorRecord | null {
    const history = this.errorHistory.get(taskId);
    if (!history || history.length === 0) {
      return null;
    }
    return history[history.length - 1];
  }

  getErrorCount(taskId: string): number {
    const history = this.errorHistory.get(taskId);
    return history ? history.length : 0;
  }

  clearErrorHistory(taskId?: string): void {
    if (taskId) {
      this.errorHistory.delete(taskId);
    } else {
      this.errorHistory.clear();
    }
  }

  getErrorTypeCounts(): Map<string, number> {
    const counts = new Map<string, number>();

    for (const history of this.errorHistory.values()) {
      for (const record of history) {
        const currentCount = counts.get(record.errorType) || 0;
        counts.set(record.errorType, currentCount + 1);
      }
    }

    return counts;
  }

  getRegisteredHandlers(): string[] {
    return Array.from(this.errorHandlers.keys());
  }
}

type ErrorHandler = (error: Error, taskId: string, context?: unknown) => Promise<ErrorHandlingResult>;

interface ErrorHandlingResult {
  handled: boolean;
  action: 'retry' | 'fail' | 'ignore' | 'escalate';
  error?: string;
  metadata?: Record<string, unknown>;
}

interface ErrorRecord {
  taskId: string;
  error: string;
  errorType: string;
  timestamp: Date;
}
