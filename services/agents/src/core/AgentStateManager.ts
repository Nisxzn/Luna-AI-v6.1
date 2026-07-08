import { AgentState, AgentStateManager as IAgentStateManager } from '@luna-ai/types';

export class AgentStateManager implements IAgentStateManager {
  private states: Map<string, AgentState>;
  private stateHistory: Map<string, AgentState[]>;
  private validTransitions: Map<AgentState, AgentState[]>;

  constructor() {
    this.states = new Map();
    this.stateHistory = new Map();
    this.validTransitions = new Map();
    this.initializeTransitions();
  }

  private initializeTransitions(): void {
    this.validTransitions.set(AgentState.Idle, [AgentState.Initializing]);
    this.validTransitions.set(AgentState.Initializing, [AgentState.Ready, AgentState.Failed]);
    this.validTransitions.set(AgentState.Ready, [AgentState.Running, AgentState.Paused]);
    this.validTransitions.set(AgentState.Running, [AgentState.Waiting, AgentState.Completed, AgentState.Failed, AgentState.Paused]);
    this.validTransitions.set(AgentState.Waiting, [AgentState.Running, AgentState.Paused, AgentState.Failed]);
    this.validTransitions.set(AgentState.Paused, [AgentState.Running, AgentState.Cancelled]);
    this.validTransitions.set(AgentState.Completed, [AgentState.Idle]);
    this.validTransitions.set(AgentState.Failed, [AgentState.Idle, AgentState.Initializing]);
    this.validTransitions.set(AgentState.Cancelled, [AgentState.Idle]);
  }

  getCurrentState(agentId: string): AgentState {
    return this.states.get(agentId) ?? AgentState.Idle;
  }

  setState(agentId: string, state: AgentState): void {
    const currentState = this.getCurrentState(agentId);
    
    if (!this.canTransition(currentState, state)) {
      throw new Error(`Invalid state transition from ${currentState} to ${state} for agent ${agentId}`);
    }

    this.states.set(agentId, state);
    
    if (!this.stateHistory.has(agentId)) {
      this.stateHistory.set(agentId, []);
    }
    this.stateHistory.get(agentId)!.push(state);
  }

  canTransition(from: AgentState, to: AgentState): boolean {
    if (from === to) return false;
    
    const allowedTransitions = this.validTransitions.get(from);
    return allowedTransitions?.includes(to) ?? false;
  }

  getStateHistory(agentId: string): AgentState[] {
    return this.stateHistory.get(agentId) ?? [];
  }

  reset(agentId: string): void {
    this.states.delete(agentId);
    this.stateHistory.delete(agentId);
  }
}
