import {
  AgentOrchestrator as IAgentOrchestrator,
  TaskPlan,
  Task,
  AgentExecutionResult,
  AgentContext,
  AgentEvent,
  AgentStatus,
  TaskStatus,
  RetryPolicy,
} from '@luna-ai/types';
import { AgentManager } from './AgentManager';
import { AgentRouter } from './AgentRouter';
import { TaskQueue } from './TaskQueue';
import { TaskPlanner } from './TaskPlanner';
import { AgentEventBus } from './AgentEventBus';
import { AgentLogger } from './AgentLogger';

export class AgentOrchestrator implements IAgentOrchestrator {
  private agentManager: AgentManager;
  private router: AgentRouter;
  private taskQueue: TaskQueue;
  private taskPlanner: TaskPlanner;
  private eventBus: AgentEventBus;
  private logger: AgentLogger;
  private activeTasks: Map<string, AbortController>;
  private retryPolicy: RetryPolicy;

  constructor(
    agentManager: AgentManager,
    router: AgentRouter,
    taskQueue: TaskQueue,
    taskPlanner: TaskPlanner,
    eventBus: AgentEventBus,
    logger: AgentLogger
  ) {
    this.agentManager = agentManager;
    this.router = router;
    this.taskQueue = taskQueue;
    this.taskPlanner = taskPlanner;
    this.eventBus = eventBus;
    this.logger = logger;
    this.activeTasks = new Map();
    this.retryPolicy = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: ['timeout', 'network', 'temporary'],
    };
  }

  async planTask(request: string, context: AgentContext): Promise<TaskPlan> {
    this.logger.info('orchestrator', `Planning task for request: ${request.substring(0, 50)}...`, 'planning');
    return await this.taskPlanner.analyzeRequest(request, context);
  }

  async executeTask(task: Task): Promise<AgentExecutionResult> {
    this.logger.info('orchestrator', `Executing task ${task.id} of type ${task.type}`, 'execution');

    // Add task to queue
    await this.taskQueue.enqueue(task);

    // Route to appropriate agent
    const agentId = await this.router.route(task);
    this.logger.info('orchestrator', `Task ${task.id} routed to agent ${agentId}`, 'routing');

    // Get agent instance
    const agent = await this.agentManager.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Update agent status
    await this.agentManager.updateAgentStatus(agentId, 'busy');

    // Create abort controller for cancellation
    const abortController = new AbortController();
    this.activeTasks.set(task.id, abortController);

    // Publish event
    await this.eventBus.publish({
      id: this.generateId(),
      type: 'task_created',
      sourceAgentId: agentId,
      taskId: task.id,
      timestamp: new Date(),
      data: { task },
    });

    try {
      // Execute with retry logic
      const result = await this.executeWithRetry(agent, task, abortController.signal);

      // Update task status
      await this.taskQueue.updateTask(task.id, {
        status: 'completed',
        completedAt: new Date(),
      });

      // Update agent metrics
      await this.router.updateAgentMetrics(agentId, result.output.success, result.executionTime);

      // Publish completion event
      await this.eventBus.publish({
        id: this.generateId(),
        type: 'task_completed',
        sourceAgentId: agentId,
        taskId: task.id,
        timestamp: new Date(),
        data: { result },
      });

      return result;
    } catch (error) {
      // Update task status
      await this.taskQueue.updateTask(task.id, {
        status: 'failed',
        completedAt: new Date(),
      });

      // Update agent metrics
      await this.router.updateAgentMetrics(agentId, false, 0);

      // Publish failure event
      await this.eventBus.publish({
        id: this.generateId(),
        type: 'task_failed',
        sourceAgentId: agentId,
        taskId: task.id,
        timestamp: new Date(),
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      throw error;
    } finally {
      // Clean up
      this.activeTasks.delete(task.id);
      await this.agentManager.updateAgentStatus(agentId, 'idle');
    }
  }

  async executePlan(plan: TaskPlan): Promise<AgentExecutionResult[]> {
    this.logger.info('orchestrator', `Executing plan with ${plan.tasks.length} tasks`, 'plan_execution');

    const results: AgentExecutionResult[] = [];

    for (const taskId of plan.executionOrder) {
      const task = plan.tasks.find(t => t.id === taskId);
      if (!task) {
        this.logger.warn('orchestrator', `Task ${taskId} not found in plan`, 'task_not_found');
        continue;
      }

      try {
        const result = await this.executeTask(task);
        results.push(result);
      } catch (error) {
        this.logger.error('orchestrator', `Task ${taskId} failed`, 'task_execution', error as Error);
        // Continue with remaining tasks even if one fails
      }
    }

    return results;
  }

  async cancelTask(taskId: string): Promise<boolean> {
    this.logger.info('orchestrator', `Cancelling task ${taskId}`, 'cancellation');

    const abortController = this.activeTasks.get(taskId);
    if (abortController) {
      abortController.abort();
      this.activeTasks.delete(taskId);

      // Update task status
      const task = await this.taskQueue.getTask(taskId);
      if (task) {
        await this.taskQueue.updateTask(taskId, {
          status: 'cancelled',
          completedAt: new Date(),
        });

        // Publish cancellation event
        await this.eventBus.publish({
          id: this.generateId(),
          type: 'task_failed',
          taskId,
          timestamp: new Date(),
          data: { reason: 'cancelled' },
        });
      }

      return true;
    }

    return false;
  }

  async getTaskStatus(taskId: string): Promise<Task | null> {
    return await this.taskQueue.getTask(taskId);
  }

  private async executeWithRetry(
    agent: any,
    task: Task,
    signal: AbortSignal
  ): Promise<AgentExecutionResult> {
    let lastError: Error | null = null;
    let delay = this.retryPolicy.initialDelay;

    for (let attempt = 0;; attempt++) {
      if (signal.aborted) {
        throw new Error('Task was cancelled');
      }

      try {
        const startTime = Date.now();
        const output = await Promise.race([
          agent.execute(task.input, task.context),
          this.createTimeoutPromise(task.timeout),
        ]);

        const executionTime = Date.now() - startTime;

        return {
          agentId: agent.id,
          taskId: task.id,
          output,
          executionTime,
          timestamp: new Date(),
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable
        const isRetryable = this.retryPolicy.retryableErrors.some(keyword =>
          lastError!.message.toLowerCase().includes(keyword)
        );

        if (attempt >= task.maxRetries || !isRetryable) {
          throw lastError;
        }

        // Update retry count
        await this.taskQueue.updateTask(task.id, {
          retryCount: attempt + 1,
        });

        // Wait before retry
        await this.sleep(delay);
        delay = Math.min(delay * this.retryPolicy.backoffMultiplier, this.retryPolicy.maxDelay);
      }
    }
  }

  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Task timeout')), timeout);
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  setRetryPolicy(policy: RetryPolicy): void {
    this.retryPolicy = policy;
  }

  getRetryPolicy(): RetryPolicy {
    return { ...this.retryPolicy };
  }

  private generateId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
