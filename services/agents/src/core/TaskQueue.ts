import { Task, TaskPriority, TaskState, TASK_PRIORITY_ORDER } from '@luna-ai/types';

interface DelayedTask {
  task: Task;
  executeAt: Date;
}

interface ScheduledTask {
  task: Task;
  scheduledAt: Date;
}

export class TaskQueue {
  private queue: Map<string, Task>;
  private delayedTasks: Map<string, DelayedTask>;
  private scheduledTasks: Map<string, ScheduledTask>;
  private priorityOrder: TaskPriority[];
  private delayedTaskCheckInterval?: NodeJS.Timeout;

  constructor() {
    this.queue = new Map();
    this.delayedTasks = new Map();
    this.scheduledTasks = new Map();
    this.priorityOrder = TASK_PRIORITY_ORDER;
    this.startDelayedTaskChecker();
  }

  async enqueue(task: Task): Promise<void> {
    this.queue.set(task.id, task);
  }

  async enqueueDelayed(task: Task, delayMs: number): Promise<void> {
    const executeAt = new Date(Date.now() + delayMs);
    this.delayedTasks.set(task.id, { task, executeAt });
  }

  async enqueueScheduled(task: Task, scheduledAt: Date): Promise<void> {
    this.scheduledTasks.set(task.id, { task, scheduledAt });
  }

  async dequeue(): Promise<Task | null> {
    await this.processDelayedTasks();
    await this.processScheduledTasks();

    if (this.queue.size === 0) {
      return null;
    }

    const tasks = Array.from(this.queue.values())
      .filter(task => task.status === TaskState.Pending || task.status === TaskState.Queued)
      .sort((a, b) => {
        const priorityDiff = this.priorityOrder.indexOf(b.priority) - this.priorityOrder.indexOf(a.priority);
        if (priorityDiff !== 0) return priorityDiff;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    if (tasks.length === 0) {
      return null;
    }

    const task = tasks[0];
    task.status = TaskState.Running;
    task.startedAt = new Date();
    task.updatedAt = new Date();
    this.queue.set(task.id, task);

    return task;
  }

  async dequeueFIFO(): Promise<Task | null> {
    await this.processDelayedTasks();
    await this.processScheduledTasks();

    if (this.queue.size === 0) {
      return null;
    }

    const tasks = Array.from(this.queue.values())
      .filter(task => task.status === TaskState.Pending || task.status === TaskState.Queued)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    if (tasks.length === 0) {
      return null;
    }

    const task = tasks[0];
    task.status = TaskState.Running;
    task.startedAt = new Date();
    task.updatedAt = new Date();
    this.queue.set(task.id, task);

    return task;
  }

  async dequeuePriority(): Promise<Task | null> {
    return this.dequeue();
  }

  async peek(): Promise<Task | null> {
    await this.processDelayedTasks();
    await this.processScheduledTasks();

    if (this.queue.size === 0) {
      return null;
    }

    const tasks = Array.from(this.queue.values())
      .filter(task => task.status === TaskState.Pending || task.status === TaskState.Queued)
      .sort((a, b) => {
        const priorityDiff = this.priorityOrder.indexOf(b.priority) - this.priorityOrder.indexOf(a.priority);
        if (priorityDiff !== 0) return priorityDiff;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    return tasks[0] || null;
  }

  async remove(taskId: string): Promise<boolean> {
    const removed = this.queue.delete(taskId);
    this.delayedTasks.delete(taskId);
    this.scheduledTasks.delete(taskId);
    return removed;
  }

  async size(): Promise<number> {
    return this.queue.size + this.delayedTasks.size + this.scheduledTasks.size;
  }

  async clear(): Promise<void> {
    this.queue.clear();
    this.delayedTasks.clear();
    this.scheduledTasks.clear();
  }

  async getTask(taskId: string): Promise<Task | null> {
    const task = this.queue.get(taskId);
    if (task) return task;

    const delayed = this.delayedTasks.get(taskId);
    if (delayed) return delayed.task;

    const scheduled = this.scheduledTasks.get(taskId);
    if (scheduled) return scheduled.task;

    return null;
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const task = this.queue.get(taskId);
    if (task) {
      Object.assign(task, updates);
      task.updatedAt = new Date();
      this.queue.set(taskId, task);
      return;
    }

    const delayed = this.delayedTasks.get(taskId);
    if (delayed) {
      Object.assign(delayed.task, updates);
      delayed.task.updatedAt = new Date();
      this.delayedTasks.set(taskId, delayed);
      return;
    }

    const scheduled = this.scheduledTasks.get(taskId);
    if (scheduled) {
      Object.assign(scheduled.task, updates);
      scheduled.task.updatedAt = new Date();
      this.scheduledTasks.set(taskId, scheduled);
    }
  }

  async getTasksByState(state: TaskState): Promise<Task[]> {
    return Array.from(this.queue.values()).filter(task => task.status === state);
  }

  async getTasksByPriority(priority: TaskPriority): Promise<Task[]> {
    return Array.from(this.queue.values()).filter(task => task.priority === priority);
  }

  async getQueueMetrics(): Promise<{ total: number; pending: number; running: number; delayed: number; scheduled: number }> {
    const total = await this.size();
    const pending = (await this.getTasksByState(TaskState.Pending)).length;
    const running = (await this.getTasksByState(TaskState.Running)).length;
    const delayed = this.delayedTasks.size;
    const scheduled = this.scheduledTasks.size;

    return { total, pending, running, delayed, scheduled };
  }

  private async processDelayedTasks(): Promise<void> {
    const now = new Date();
    const readyTasks: DelayedTask[] = [];

    for (const [taskId, delayedTask] of this.delayedTasks.entries()) {
      if (delayedTask.executeAt <= now) {
        readyTasks.push(delayedTask);
      }
    }

    for (const readyTask of readyTasks) {
      this.delayedTasks.delete(readyTask.task.id);
      readyTask.task.status = TaskState.Queued;
      readyTask.task.updatedAt = new Date();
      this.queue.set(readyTask.task.id, readyTask.task);
    }
  }

  private async processScheduledTasks(): Promise<void> {
    const now = new Date();
    const readyTasks: ScheduledTask[] = [];

    for (const [taskId, scheduledTask] of this.scheduledTasks.entries()) {
      if (scheduledTask.scheduledAt <= now) {
        readyTasks.push(scheduledTask);
      }
    }

    for (const readyTask of readyTasks) {
      this.scheduledTasks.delete(readyTask.task.id);
      readyTask.task.status = TaskState.Queued;
      readyTask.task.updatedAt = new Date();
      this.queue.set(readyTask.task.id, readyTask.task);
    }
  }

  private startDelayedTaskChecker(): void {
    this.delayedTaskCheckInterval = setInterval(() => {
      this.processDelayedTasks();
      this.processScheduledTasks();
    }, 1000);
  }

  destroy(): void {
    if (this.delayedTaskCheckInterval) {
      clearInterval(this.delayedTaskCheckInterval);
    }
  }
}
