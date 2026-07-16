import type { AgentMessage, IAgentChannel, AgentChannelEntry } from '@luna-ai/types';

/**
 * AgentChannel — per-agent inbox with queued delivery and push notifications.
 *
 * Each registered agent gets one channel. The communication bus routes
 * targeted messages here; the agent (or any code holding a reference) can
 * pull messages out via receive() / drain(), or react immediately by
 * registering an onReceive handler.
 *
 * Cancellation: calling clear() discards all pending messages.  The channel
 * itself has no async state — cancellation of in-flight operations is handled
 * at the CommunicationBus level.
 */
export class AgentChannel implements IAgentChannel {
  readonly agentId: string;

  private inbox: AgentChannelEntry[];
  private receiveHandlers: Set<(message: AgentMessage) => void>;
  private readonly maxInboxSize: number;

  constructor(agentId: string, maxInboxSize = 500) {
    this.agentId = agentId;
    this.inbox = [];
    this.receiveHandlers = new Set();
    this.maxInboxSize = maxInboxSize;
  }

  // ---------------------------------------------------------------------------
  // Delivery
  // ---------------------------------------------------------------------------

  /**
   * Deliver a message into this channel's inbox and notify all receive handlers.
   * If the inbox is full the oldest unread message is evicted (ring-buffer behaviour).
   */
  deliver(message: AgentMessage): void {
    if (this.inbox.length >= this.maxInboxSize) {
      // Evict the oldest entry to make room
      this.inbox.shift();
    }

    const entry: AgentChannelEntry = {
      message,
      receivedAt: new Date(),
      read: false,
    };

    this.inbox.push(entry);

    // Notify all push-style subscribers
    for (const handler of this.receiveHandlers) {
      try {
        handler(message);
      } catch (err) {
        console.error(
          `[AgentChannel:${this.agentId}] receive handler threw:`,
          err,
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Pull-style reads
  // ---------------------------------------------------------------------------

  /** Returns the next unread message and marks it read, or null if none. */
  receive(): AgentMessage | null {
    const entry = this.inbox.find(e => !e.read);
    if (!entry) return null;
    entry.read = true;
    return entry.message;
  }

  /** Returns all unread messages, marking each as read. */
  drain(): AgentMessage[] {
    const unread = this.inbox.filter(e => !e.read);
    unread.forEach(e => { e.read = true; });
    return unread.map(e => e.message);
  }

  // ---------------------------------------------------------------------------
  // Push-style subscriptions
  // ---------------------------------------------------------------------------

  onReceive(handler: (message: AgentMessage) => void): void {
    this.receiveHandlers.add(handler);
  }

  offReceive(handler: (message: AgentMessage) => void): void {
    this.receiveHandlers.delete(handler);
  }

  // ---------------------------------------------------------------------------
  // Introspection
  // ---------------------------------------------------------------------------

  pendingCount(): number {
    return this.inbox.filter(e => !e.read).length;
  }

  /** Full inbox snapshot (read + unread), newest-last. */
  getInbox(): AgentChannelEntry[] {
    return [...this.inbox];
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /** Discard all inbox entries and remove all receive handlers. */
  clear(): void {
    this.inbox = [];
    this.receiveHandlers.clear();
  }
}
