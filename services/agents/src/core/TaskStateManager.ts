import { Task, TaskState, TASK_STATE_TRANSITIONS } from '@luna-ai/types';

export class TaskStateManager {
  private states: Map<string, TaskState>;
  private stateHistory: Map<string, TaskState[]>;

  constructor() {
    this.states = new Map();
    this.stateHistory = new Map();
  }

  getCurrentState(taskId: string): TaskState {
    return this.states.get(taskId) ?? TaskState.Pending;
  }

  setState(taskId: string, state: TaskState): void {
    const currentState = this.getCurrentState(taskId);
    
    if (!this.canTransition(currentState, state)) {
      throw new Error(
        `Invalid state transition from ${currentState} to ${state} for task ${taskId}`
      );
    }

    this.states.set(taskId, state);
    
    // Update state history
    const history = this.stateHistory.get(taskId) || [];
    history.push(state);
    this.stateHistory.set(taskId, history);
  }

  canTransition(from: TaskState, to: TaskState): boolean {
    const allowedTransitions = TASK_STATE_TRANSITIONS[from] || [];
    return allowedTransitions.includes(to);
  }

  getStateHistory(taskId: string): TaskState[] {
    return this.stateHistory.get(taskId) || [];
  }

  getAllStates(): Map<string, TaskState> {
    return new Map(this.states);
  }

  clearState(taskId: string): void {
    this.states.delete(taskId);
    this.stateHistory.delete(taskId);
  }

  clearAllStates(): void {
    this.states.clear();
    this.stateHistory.clear();
  }

  getTasksByState(state: TaskState): string[] {
    const taskIds: string[] = [];
    for (const [taskId, taskState] of this.states.entries()) {
      if (taskState === state) {
        taskIds.push(taskId);
      }
    }
    return taskIds;
  }

  getStateCount(state: TaskState): number {
    return this.getTasksByState(state).length;
  }
}
