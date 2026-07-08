import { Task, TaskPriority, TaskStatus } from '@luna-ai/types';

export class TaskQueue {
  private queue: Map<string, Task>;
  private priorityOrder: TaskPriority[];

  constructor() {
    this.queue = new Map();
    this.priorityOrder = ['critical', 'high', 'medium', 'low'];
  }

  async enqueue(task: Task): Promise<void> {
    this.queue.set(task.id, task);
  }

  async dequeue(): Promise<Task | null> {
    if (this.queue.size === 0) {
      return null;
    }

    const tasks = Array.from(this.queue.values())
      .filter(task => task.status === 'pending')
      .sort((a, b) => {
        const priorityDiff = this.priorityOrder.indexOf(b.priority) - this.priorityOrder.indexOf(a.priority);
        if (priorityDiff !== 0) return priorityDiff;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    if (tasks.length === 0) {
      return null;
    }

    const task = tasks[0];
    task.status = 'in_progress';
    task.startedAt = new Date();
    task.updatedAt = new Date();
    this.queue.set(task.id, task);

    return task;
  }

  async peek(): Promise<Task | null> {
    if (this.queue.size === 0) {
      return null;
    }

    const tasks = Array.from(this.queue.values())
      .filter(task => task.status === 'pending')
      .sort((a, b) => {
        const priorityDiff = this.priorityOrder.indexOf(b.priority) - this.priorityOrder.indexOf(a.priority);
        if (priorityDiff !== 0) return priorityDiff;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });

    return tasks[0] || null;
  }

  async remove(taskId: string): Promise<boolean> {
    return this.queue.delete(taskId);
  }

  async size(): Promise<number> {
    return this.queue.size;
  }

  async clear(): Promise<void> {
    this.queue.clear();
  }

  async getTask(taskId: string): Promise<Task | null> {
    return this.queue.get(taskId) || null;
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const task = this.queue.get(taskId);
    if (task) {
      Object.assign(task, updates);
      task.updatedAt = new Date();
      this.queue.set(taskId, task);
    }
  }

  async getTasksByStatus(status: TaskStatus): Promise<Task[]> {
    return Array.from(this.queue.values()).filter(task => task.status === status);
  }

  async getTasksByPriority(priority: TaskPriority): Promise<Task[]> {
    return Array.from(this.queue.values()).filter(task => task.priority === priority);
  }
}
