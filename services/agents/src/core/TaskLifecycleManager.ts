import { Task, TaskState } from '@luna-ai/types';
import { TaskStateManager } from './TaskStateManager';
import { TaskQueue } from './TaskQueue';

export class TaskLifecycleManager {
  private stateManager: TaskStateManager;
  private taskQueue: TaskQueue;
  private taskStore: Map<string, Task>;

  constructor(stateManager: TaskStateManager, taskQueue: TaskQueue) {
    this.stateManager = stateManager;
    this.taskQueue = taskQueue;
    this.taskStore = new Map();
  }

  async createTask(task: Task): Promise<Task> {
    task.status = TaskState.Pending;
    task.createdAt = new Date();
    task.updatedAt = new Date();
    
    this.stateManager.setState(task.id, TaskState.Pending);
    this.taskStore.set(task.id, task);
    
    return task;
  }

  async planTask(taskId: string): Promise<Task | null> {
    const task = this.taskStore.get(taskId);
    if (!task) {
      return null;
    }

    this.stateManager.setState(taskId, TaskState.Planned);
    task.status = TaskState.Planned;
    task.updatedAt = new Date();
    this.taskStore.set(taskId, task);
    
    return task;
  }

  async queueTask(taskId: string): Promise<Task | null> {
    const task = this.taskStore.get(taskId);
    if (!task) {
      return null;
    }

    this.stateManager.setState(taskId, TaskState.Queued);
    task.status = TaskState.Queued;
    task.updatedAt = new Date();
    this.taskStore.set(taskId, task);
    
    await this.taskQueue.enqueue(task);
    
    return task;
  }

  async executeTask(taskId: string): Promise<Task | null> {
    const task = this.taskStore.get(taskId);
    if (!task) {
      return null;
    }

    this.stateManager.setState(taskId, TaskState.Running);
    task.status = TaskState.Running;
    task.startedAt = new Date();
    task.updatedAt = new Date();
    this.taskStore.set(taskId, task);
    
    return task;
  }

  async pauseTask(taskId: string): Promise<Task | null> {
    const task = this.taskStore.get(taskId);
    if (!task) {
      return null;
    }

    this.stateManager.setState(taskId, TaskState.Waiting);
    task.status = TaskState.Waiting;
    task.updatedAt = new Date();
    this.taskStore.set(taskId, task);
    
    return task;
  }

  async resumeTask(taskId: string): Promise<Task | null> {
    const task = this.taskStore.get(taskId);
    if (!task) {
      return null;
    }

    this.stateManager.setState(taskId, TaskState.Running);
    task.status = TaskState.Running;
    task.updatedAt = new Date();
    this.taskStore.set(taskId, task);
    
    return task;
  }

  async retryTask(taskId: string): Promise<Task | null> {
    const task = this.taskStore.get(taskId);
    if (!task) {
      return null;
    }

    if (task.retries >= task.maxRetries) {
      return null;
    }

    task.retries++;
    this.stateManager.setState(taskId, TaskState.Pending);
    task.status = TaskState.Pending;
    task.updatedAt = new Date();
    this.taskStore.set(taskId, task);
    
    await this.taskQueue.enqueue(task);
    
    return task;
  }

  async cancelTask(taskId: string): Promise<Task | null> {
    const task = this.taskStore.get(taskId);
    if (!task) {
      return null;
    }

    this.stateManager.setState(taskId, TaskState.Cancelled);
    task.status = TaskState.Cancelled;
    task.cancelledAt = new Date();
    task.updatedAt = new Date();
    this.taskStore.set(taskId, task);
    
    await this.taskQueue.remove(taskId);
    
    return task;
  }

  async completeTask(taskId: string, output?: unknown): Promise<Task | null> {
    const task = this.taskStore.get(taskId);
    if (!task) {
      return null;
    }

    this.stateManager.setState(taskId, TaskState.Completed);
    task.status = TaskState.Completed;
    task.completedAt = new Date();
    task.updatedAt = new Date();
    if (output !== undefined) {
      task.output = output;
    }
    this.taskStore.set(taskId, task);
    
    return task;
  }

  async failTask(taskId: string, error: string): Promise<Task | null> {
    const task = this.taskStore.get(taskId);
    if (!task) {
      return null;
    }

    this.stateManager.setState(taskId, TaskState.Failed);
    task.status = TaskState.Failed;
    task.failedAt = new Date();
    task.updatedAt = new Date();
    task.error = error;
    this.taskStore.set(taskId, task);
    
    return task;
  }

  async timeoutTask(taskId: string): Promise<Task | null> {
    const task = this.taskStore.get(taskId);
    if (!task) {
      return null;
    }

    this.stateManager.setState(taskId, TaskState.Timeout);
    task.status = TaskState.Timeout;
    task.updatedAt = new Date();
    this.taskStore.set(taskId, task);
    
    return task;
  }

  async archiveTask(taskId: string): Promise<boolean> {
    const task = this.taskStore.get(taskId);
    if (!task) {
      return false;
    }

    // Only archive completed, failed, or cancelled tasks
    if (
      task.status !== TaskState.Completed &&
      task.status !== TaskState.Failed &&
      task.status !== TaskState.Cancelled
    ) {
      return false;
    }

    this.stateManager.clearState(taskId);
    this.taskStore.delete(taskId);
    
    return true;
  }

  getTask(taskId: string): Task | null {
    return this.taskStore.get(taskId) || null;
  }

  getAllTasks(): Task[] {
    return Array.from(this.taskStore.values());
  }

  getTasksByState(state: TaskState): Task[] {
    return Array.from(this.taskStore.values()).filter(task => task.status === state);
  }

  getTasksByParent(parentTaskId: string): Task[] {
    return Array.from(this.taskStore.values()).filter(task => task.parentTaskId === parentTaskId);
  }

  updateTask(taskId: string, updates: Partial<Task>): Task | null {
    const task = this.taskStore.get(taskId);
    if (!task) {
      return null;
    }

    Object.assign(task, updates);
    task.updatedAt = new Date();
    this.taskStore.set(taskId, task);
    
    return task;
  }

  deleteTask(taskId: string): boolean {
    this.stateManager.clearState(taskId);
    return this.taskStore.delete(taskId);
  }

  clearAll(): void {
    this.stateManager.clearAllStates();
    this.taskStore.clear();
  }

  getTaskCount(): number {
    return this.taskStore.size;
  }

  getTaskCountByState(state: TaskState): number {
    return this.getTasksByState(state).length;
  }

  getStateManager(): TaskStateManager {
    return this.stateManager;
  }

  getTaskQueue(): TaskQueue {
    return this.taskQueue;
  }
}
