import {
  AgentExceptionHandler as IAgentExceptionHandler,
  AgentContext,
} from '@luna-ai/types';
import { AgentLogger } from './AgentLogger';

type ErrorHandler = (error: Error, agentId: string, context: AgentContext) => Promise<void>;

export class AgentExceptionHandler implements IAgentExceptionHandler {
  private handlers: Map<string, ErrorHandler>;
  private lastErrors: Map<string, Error>;
  private logger: AgentLogger;

  constructor(logger: AgentLogger) {
    this.handlers = new Map();
    this.lastErrors = new Map();
    this.logger = logger;
  }

  async handle(error: Error, agentId: string, context: AgentContext): Promise<void> {
    this.lastErrors.set(agentId, error);
    this.logger.error(agentId, `Exception occurred: ${error.message}`, 'exception', error, { context });

    const errorType = error.constructor.name;
    const handler = this.handlers.get(errorType);

    if (handler) {
      try {
        await handler(error, agentId, context);
        this.logger.info(agentId, `Exception handled by ${errorType} handler`, 'exception');
      } catch (handlerError) {
        this.logger.error(agentId, `Exception handler failed`, 'exception', handlerError as Error);
        throw handlerError;
      }
    } else {
      const defaultHandler = this.handlers.get('default');
      if (defaultHandler) {
        try {
          await defaultHandler(error, agentId, context);
          this.logger.info(agentId, `Exception handled by default handler`, 'exception');
        } catch (handlerError) {
          this.logger.error(agentId, `Default exception handler failed`, 'exception', handlerError as Error);
          throw handlerError;
        }
      } else {
        this.logger.warn(agentId, `No handler registered for error type: ${errorType}`, 'exception');
      }
    }
  }

  registerHandler(errorType: string, handler: ErrorHandler): void {
    this.handlers.set(errorType, handler);
    this.logger.info('exception-handler', `Handler registered for error type: ${errorType}`, 'registration');
  }

  getLastError(agentId: string): Error | null {
    return this.lastErrors.get(agentId) || null;
  }

  hasHandler(errorType: string): boolean {
    return this.handlers.has(errorType);
  }

  unregisterHandler(errorType: string): boolean {
    const result = this.handlers.delete(errorType);
    if (result) {
      this.logger.info('exception-handler', `Handler unregistered for error type: ${errorType}`, 'registration');
    }
    return result;
  }

  clearLastError(agentId: string): void {
    this.lastErrors.delete(agentId);
  }

  clearAllLastErrors(): void {
    this.lastErrors.clear();
  }

  clearHandlers(): void {
    this.handlers.clear();
    this.logger.info('exception-handler', 'All handlers cleared', 'registration');
  }

  getRegisteredErrorTypes(): string[] {
    return Array.from(this.handlers.keys());
  }
}
