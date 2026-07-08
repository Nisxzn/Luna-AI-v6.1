import { AgentEvent, AgentMessage } from '@luna-ai/types';

type EventHandler<T extends AgentEvent = AgentEvent> = (event: T) => void | Promise<void>;

export class AgentEventBus {
  private eventHandlers: Map<string, Set<EventHandler>>;
  private messageHandlers: Set<(message: AgentMessage) => void>;
  private eventHistory: AgentEvent[];
  private maxHistorySize: number;

  constructor(maxHistorySize = 1000) {
    this.eventHandlers = new Map();
    this.messageHandlers = new Set();
    this.eventHistory = [];
    this.maxHistorySize = maxHistorySize;
  }

  async publish(event: AgentEvent): Promise<void> {
    // Add to history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    const handlers = this.eventHandlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(event);
        } catch (error) {
          console.error(`Error in event handler for ${event.type}:`, error);
        }
      }
    }
  }

  subscribe<T extends AgentEvent = AgentEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler as EventHandler);
  }

  unsubscribe(eventType: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  async sendMessage(message: AgentMessage): Promise<void> {
    for (const handler of this.messageHandlers) {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in message handler:', error);
      }
    }
  }

  onMessage(handler: (message: AgentMessage) => void): void {
    this.messageHandlers.add(handler);
  }

  offMessage(handler: (message: AgentMessage) => void): void {
    this.messageHandlers.delete(handler);
  }

  getEventHistory(): AgentEvent[] {
    return [...this.eventHistory];
  }

  getEventHistoryByType(eventType: string): AgentEvent[] {
    return this.eventHistory.filter(event => event.type === eventType);
  }

  getEventHistoryByAgent(agentId: string): AgentEvent[] {
    return this.eventHistory.filter(
      event => event.sourceAgentId === agentId || event.targetAgentId === agentId
    );
  }

  clearHistory(): void {
    this.eventHistory = [];
  }

  clear(): void {
    this.eventHandlers.clear();
    this.messageHandlers.clear();
    this.clearHistory();
  }

  getSubscriberCount(eventType: string): number {
    return this.eventHandlers.get(eventType)?.size ?? 0;
  }

  hasSubscribers(eventType: string): boolean {
    return (this.eventHandlers.get(eventType)?.size ?? 0) > 0;
  }
}
