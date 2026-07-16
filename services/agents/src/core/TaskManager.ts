import { Task, TaskState, AgentContext, TaskPlan, TaskExecutionResult, TaskManagerConfig } from '@luna-ai/types';
import { TaskStateManager } from './TaskStateManager';
import { TaskQueue } from './TaskQueue';
import { TaskPlanner } from './TaskPlanner';
import { TaskRouter } from './TaskRouter';
import { TaskExecutor } from './TaskExecutor';
import { TaskScheduler } from './TaskScheduler';
import { TaskLifecycleManager } from './TaskLifecycleManager';
import { TaskLogger } from './TaskLogger';
import { TaskMetrics } from './TaskMetrics';
import { TaskExceptionHandler } from './TaskExceptionHandler';
import { BaseAgent, AgentConfig } from '@luna-ai/types';

export class TaskManager {
  private stateManager: TaskStateManager;
  private taskQueue: TaskQueue;
  private taskPlanner: TaskPlanner;
  private taskRouter: TaskRouter;
  private taskExecutor: TaskExecutor;
  private taskScheduler: TaskScheduler;
  private lifecycleManager: TaskLifecycleManager;
  private taskLogger: TaskLogger;
  private taskMetrics: TaskMetrics;
  private exceptionHandler: TaskExceptionHandler;
  private config: TaskManagerConfig;
  private isRunning: boolean;

  constructor(config?: Partial<TaskManagerConfig>) {
    this.config = {
      scheduler: {
        maxConcurrentTasks: 1,
        enableDependencyResolution: true,
        enablePriorityScheduling: true,
        enableTimeoutHandling: true,
      },
      router: {
        enableAgentSelection: true,
        enableCapabilityMatching: true,
        enableLoadBalancing: true,
      },
      executor: {
        enableRetries: true,
        enableTimeouts: true,
        enableErrorHandling: true,
        retryPolicy: undefined as any,
        timeoutPolicy: undefined as any,
      },
      ...config,
    };

    this.stateManager = new TaskStateManager();
    this.taskQueue = new TaskQueue();
    this.taskPlanner = new TaskPlanner();
    this.taskRouter = new TaskRouter();
    
    // Create executor with optional policies
    if (this.config.executor.retryPolicy && this.config.executor.timeoutPolicy) {
      this.taskExecutor = new TaskExecutor(
        this.config.executor.retryPolicy,
        this.config.executor.timeoutPolicy
      );
    } else {
      this.taskExecutor = new TaskExecutor();
    }
    
    this.taskScheduler = new TaskScheduler(this.config.scheduler);
    this.lifecycleManager = new TaskLifecycleManager(this.stateManager, this.taskQueue);
    this.taskLogger = new TaskLogger();
    this.taskMetrics = new TaskMetrics();
    this.exceptionHandler = new TaskExceptionHandler();
    this.isRunning = false;
  }

  async initialize(): Promise<void> {
    this.taskLogger.info('TaskManager', 'Initializing Task Manager');
    
    // Register default error handlers
    this.registerDefaultErrorHandlers();
    
    this.taskLogger.info('TaskManager', 'Task Manager initialized successfully');
  }

  async submitTask(task: Task): Promise<Task> {
    this.taskLogger.info(task.id, 'Task submitted', { type: task.type, priority: task.priority });
    
    // Create task
    const createdTask = await this.lifecycleManager.createTask(task);
    this.taskMetrics.recordTaskCreated(createdTask);
    
    // Plan task
    await this.lifecycleManager.planTask(task.id);
    
    // Queue task
    await this.lifecycleManager.queueTask(task.id);
    
    // Schedule task
    this.taskScheduler.schedule(createdTask);
    
    return createdTask;
  }

  async submitRequest(request: string, context: AgentContext): Promise<TaskPlan> {
    this.taskLogger.info('TaskManager', 'Processing request', { request });
    
    // Analyze request and create task plan
    const plan = await this.taskPlanner.analyzeRequest(request, context);
    
    // Submit all tasks in the plan
    for (const task of plan.tasks) {
      await this.submitTask(task);
    }
    
    return plan;
  }

  async processNextTask(): Promise<TaskExecutionResult | null> {
    const task = await this.taskQueue.dequeue();
    if (!task) {
      return null;
    }

    this.taskLogger.info(task.id, 'Processing task', { type: task.type });
    
    // Execute task
    await this.lifecycleManager.executeTask(task.id);
    
    try {
      // Route to agent
      const agentId = await this.taskRouter.route(task);
      if (!agentId) {
        throw new Error('No compatible agent found for task');
      }

      task.assignedAgent = agentId;
      
      // Execute task with agent
      const result = await this.executeTaskWithAgent(task, agentId);
      
      // Complete task
      await this.lifecycleManager.completeTask(task.id, result.output);
      this.taskMetrics.recordTaskCompleted(task, true);
      this.taskLogger.logTaskExecution(task.id, TaskState.Completed, agentId, result.executionTime);
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Handle error
      const handlingResult = await this.exceptionHandler.handle(error as Error, task.id);
      
      if (handlingResult.action === 'retry' && task.retries < task.maxRetries) {
        await this.lifecycleManager.retryTask(task.id);
        this.taskLogger.warn(task.id, 'Task scheduled for retry', { retry: task.retries + 1 });
      } else {
        await this.lifecycleManager.failTask(task.id, errorMessage);
        this.taskMetrics.recordTaskCompleted(task, false);
        this.taskLogger.logTaskError(task.id, errorMessage, task.assignedAgent);
      }
      
      return {
        taskId: task.id,
        success: false,
        error: errorMessage,
        executionTime: 0,
        tokensUsed: 0,
        timestamp: new Date(),
      };
    }
  }

  async executeTaskWithAgent(task: Task, agentId: string): Promise<TaskExecutionResult> {
    // This is a placeholder - in a real implementation, this would call the agent's execute method
    // For now, we'll use the TaskExecutor to run a simple function
    return this.taskExecutor.execute(task, async () => {
      // Simulate task execution
      await new Promise(resolve => setTimeout(resolve, 100));
      return { result: 'Task executed successfully' };
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.taskLogger.info('TaskManager', 'Starting task processing');
    
    this.taskScheduler.start(async (task) => {
      await this.processTask(task);
    });
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.taskScheduler.stop();
    this.taskLogger.info('TaskManager', 'Task processing stopped');
  }

  private async processTask(task: Task): Promise<void> {
    try {
      await this.processNextTask();
    } catch (error) {
      this.taskLogger.error(task.id, 'Error processing task', error as Error);
    }
  }

  async cancelTask(taskId: string): Promise<boolean> {
    this.taskLogger.info(taskId, 'Cancelling task');
    
    // Cancel execution
    this.taskExecutor.cancelTask(taskId);
    
    // Update lifecycle
    const task = await this.lifecycleManager.cancelTask(taskId);
    if (task) {
      this.taskMetrics.recordTaskCancelled(task);
      return true;
    }
    
    return false;
  }

  async pauseTask(taskId: string): Promise<boolean> {
    this.taskLogger.info(taskId, 'Pausing task');
    
    const task = await this.lifecycleManager.pauseTask(taskId);
    return task !== null;
  }

  async resumeTask(taskId: string): Promise<boolean> {
    this.taskLogger.info(taskId, 'Resuming task');
    
    const task = await this.lifecycleManager.resumeTask(taskId);
    if (task) {
      await this.taskQueue.enqueue(task);
      return true;
    }
    
    return false;
  }

  getTask(taskId: string): Task | null {
    return this.lifecycleManager.getTask(taskId);
  }

  getAllTasks(): Task[] {
    return this.lifecycleManager.getAllTasks();
  }

  getTasksByState(state: TaskState): Task[] {
    return this.lifecycleManager.getTasksByState(state);
  }

  registerAgent(agent: BaseAgent, config: AgentConfig): void {
    this.taskRouter.registerAgent(agent, config);
    this.taskLogger.info('TaskManager', `Agent registered: ${agent.id}`);
  }

  unregisterAgent(agentId: string): void {
    this.taskRouter.unregisterAgent(agentId);
    this.taskLogger.info('TaskManager', `Agent unregistered: ${agentId}`);
  }

  getMetrics() {
    return this.taskMetrics.getMetrics();
  }

  getLogs(taskId?: string) {
    return this.taskLogger.getLogs(taskId);
  }

  getQueueMetrics() {
    return this.taskQueue.getQueueMetrics();
  }

  private registerDefaultErrorHandlers(): void {
    this.exceptionHandler.registerHandler('TimeoutError', async (error, taskId) => ({
      handled: true,
      action: 'retry',
      error: error.message,
    }));

    this.exceptionHandler.registerHandler('NetworkError', async (error, taskId) => ({
      handled: true,
      action: 'retry',
      error: error.message,
    }));

    this.exceptionHandler.registerHandler('ValidationError', async (error, taskId) => ({
      handled: true,
      action: 'fail',
      error: error.message,
    }));
  }

  async shutdown(): Promise<void> {
    this.taskLogger.info('TaskManager', 'Shutting down Task Manager');
    
    await this.stop();
    this.taskQueue.destroy();
    this.lifecycleManager.clearAll();
    this.taskLogger.clearLogs();
    this.taskMetrics.reset();
    
    this.taskLogger.info('TaskManager', 'Task Manager shut down successfully');
  }

  getStateManager(): TaskStateManager {
    return this.stateManager;
  }

  getTaskQueue(): TaskQueue {
    return this.taskQueue;
  }

  getTaskPlanner(): TaskPlanner {
    return this.taskPlanner;
  }

  getTaskRouter(): TaskRouter {
    return this.taskRouter;
  }

  getTaskExecutor(): TaskExecutor {
    return this.taskExecutor;
  }

  getTaskScheduler(): TaskScheduler {
    return this.taskScheduler;
  }

  getLifecycleManager(): TaskLifecycleManager {
    return this.lifecycleManager;
  }

  getTaskLogger(): TaskLogger {
    return this.taskLogger;
  }

  getTaskMetrics(): TaskMetrics {
    return this.taskMetrics;
  }

  getExceptionHandler(): TaskExceptionHandler {
    return this.exceptionHandler;
  }
}
