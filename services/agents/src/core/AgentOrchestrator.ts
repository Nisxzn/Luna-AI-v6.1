import {
  AgentOrchestrator as IAgentOrchestrator,
  TaskPlan,
  Task,
  AgentExecutionResult,
  AgentContext,
  TaskState,
  RetryPolicy,
  TypedAgentEvent,
} from '@luna-ai/types';
import { AgentManager } from './AgentManager';
import { AgentRouter } from './AgentRouter';
import { TaskQueue } from './TaskQueue';
import { TaskPlanner } from './TaskPlanner';
import { AgentEventBus } from './AgentEventBus';
import { AgentCommunicationBus } from './AgentCommunicationBus';
import { AgentLogger } from './AgentLogger';
import type { SharedContextManager } from '../context/SharedContextManager';

export class AgentOrchestrator implements IAgentOrchestrator {
  private agentManager: AgentManager;
  private router: AgentRouter;
  private taskQueue: TaskQueue;
  private taskPlanner: TaskPlanner;
  private eventBus: AgentEventBus;
  private commBus: AgentCommunicationBus | null;
  private contextManager: SharedContextManager | null;
  private logger: AgentLogger;
  private activeTasks: Map<string, AbortController>;
  private retryPolicy: RetryPolicy;

  constructor(
    agentManager: AgentManager,
    router: AgentRouter,
    taskQueue: TaskQueue,
    taskPlanner: TaskPlanner,
    eventBus: AgentEventBus,
    logger: AgentLogger,
    commBus?: AgentCommunicationBus,
    contextManager?: SharedContextManager,
  ) {
    this.agentManager = agentManager;
    this.router = router;
    this.taskQueue = taskQueue;
    this.taskPlanner = taskPlanner;
    this.eventBus = eventBus;
    this.commBus = commBus ?? null;
    this.contextManager = contextManager ?? null;
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

    // Enrich the planning context with the live shared context
    const enriched = this.enrichAgentContext(context);
    return await this.taskPlanner.analyzeRequest(request, enriched);
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

    // Stamp the active agent / task into the shared context
    if (this.contextManager) {
      await this.contextManager.updateApplicationState({
        activeAgentId: agentId,
        activeTaskId:  task.id,
      }).catch(() => { /* non-fatal */ });
    }

    // Create abort controller for cancellation
    const abortController = new AbortController();
    this.activeTasks.set(task.id, abortController);

    // Publish task_created via communication bus (falls back to legacy bus)
    await this.publishEvent({
      id: this.generateId(),
      type: 'task_created',
      sourceAgentId: agentId,
      taskId: task.id,
      timestamp: new Date(),
      data: { taskId: task.id, taskType: task.type },
    });

    try {
      // Execute with retry logic — passes enriched AgentContext to the agent
      const result = await this.executeWithRetry(agent, task, abortController.signal, agentId);

      // Update task status
      await this.taskQueue.updateTask(task.id, {
        status: TaskState.Completed,
        completedAt: new Date(),
      });

      // Update agent metrics
      await this.router.updateAgentMetrics(agentId, result.output.success, result.executionTime);

      // Publish task_completed
      await this.publishEvent({
        id: this.generateId(),
        type: 'task_completed',
        sourceAgentId: agentId,
        taskId: task.id,
        timestamp: new Date(),
        data: { taskId: task.id, taskType: task.type },
      });

      return result;
    } catch (error) {
      // Update task status
      await this.taskQueue.updateTask(task.id, {
        status: TaskState.Failed,
        completedAt: new Date(),
      });

      // Update agent metrics
      await this.router.updateAgentMetrics(agentId, false, 0);

      const errorMsg = error instanceof Error ? error.message : 'Unknown error';

      // Publish task_failed
      await this.publishEvent({
        id: this.generateId(),
        type: 'task_failed',
        sourceAgentId: agentId,
        taskId: task.id,
        timestamp: new Date(),
        data: { taskId: task.id, error: errorMsg },
      });

      throw error;
    } finally {
      // Clear active agent / task from shared context
      if (this.contextManager) {
        await this.contextManager.updateApplicationState({
          activeAgentId: null,
          activeTaskId:  null,
        }).catch(() => { /* non-fatal */ });
      }

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
          status: TaskState.Cancelled,
          completedAt: new Date(),
        });

        // Publish cancellation event
        await this.publishEvent({
          id: this.generateId(),
          type: 'agent_cancelled',
          taskId,
          timestamp: new Date(),
          data: { agentId: task.assignedAgent ?? 'unknown', reason: 'cancelled' },
          cancelled: true,
        });
      }

      return true;
    }

    return false;
  }

  async getTaskStatus(taskId: string): Promise<Task | null> {
    return await this.taskQueue.getTask(taskId);
  }

  /**
   * Publish a typed event via the communication bus when available,
   * falling back to the legacy AgentEventBus.
   */
  private async publishEvent(event: TypedAgentEvent): Promise<void> {
    if (this.commBus) {
      await this.commBus.publish(event);
    } else {
      await this.eventBus.publish({
        id: event.id,
        type: this.toLegacyType(event.type),
        sourceAgentId: event.sourceAgentId,
        targetAgentId: event.targetAgentId,
        taskId: event.taskId,
        timestamp: event.timestamp,
        data: event.data,
      });
    }
  }

  private toLegacyType(
    type: string,
  ): 'agent_started' | 'agent_completed' | 'agent_failed' | 'agent_cancelled' | 'task_created' | 'task_completed' | 'task_failed' | 'message' {
    const map: Record<string, 'agent_started' | 'agent_completed' | 'agent_failed' | 'agent_cancelled' | 'task_created' | 'task_completed' | 'task_failed' | 'message'> = {
      agent_started: 'agent_started',
      agent_completed: 'agent_completed',
      agent_failed: 'agent_failed',
      agent_cancelled: 'agent_cancelled',
      task_created: 'task_created',
      task_completed: 'task_completed',
      task_failed: 'task_failed',
    };
    return map[type] ?? 'message';
  }

  private async executeWithRetry(
    agent: any,
    task: Task,
    signal: AbortSignal,
    agentId: string,
  ): Promise<AgentExecutionResult> {
    let lastError: Error | null = null;
    let delay = this.retryPolicy.initialDelay;

    // Build the enriched AgentContext once for all retry attempts
    const taskContext = task.metadata?.context as AgentContext | undefined;
    const agentContext = this.enrichAgentContext(taskContext ?? {}, agentId);

    for (let attempt = 0;; attempt++) {
      if (signal.aborted) {
        throw new Error('Task was cancelled');
      }

      try {
        const startTime = Date.now();
        const output = await Promise.race([
          agent.execute(task.input, agentContext),
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

        const isRetryable = this.retryPolicy.retryableErrors.some(keyword =>
          lastError!.message.toLowerCase().includes(keyword),
        );

        if (attempt >= task.maxRetries || !isRetryable) {
          throw lastError;
        }

        await this.taskQueue.updateTask(task.id, { retries: attempt + 1 });
        await this.sleep(delay);
        delay = Math.min(delay * this.retryPolicy.backoffMultiplier, this.retryPolicy.maxDelay);
      }
    }
  }

  /**
   * Merge a caller-supplied AgentContext with the live SharedContext.
   * Fields from the SharedContext fill in any gaps; the caller's values
   * always take precedence so individual agents can still override.
   */
  private enrichAgentContext(
    base: Partial<AgentContext>,
    agentId?: string,
  ): AgentContext {
    if (!this.contextManager) {
      return base as AgentContext;
    }

    const shared = this.contextManager.getAgentContext(agentId);

    return {
      // Shared context provides the defaults
      ...shared,
      // Caller's explicit values override
      ...Object.fromEntries(
        Object.entries(base).filter(([, v]) => v !== undefined && v !== null),
      ),
    } as AgentContext;
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

  getCommunicationBus(): AgentCommunicationBus | null {
    return this.commBus;
  }

  private generateId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
