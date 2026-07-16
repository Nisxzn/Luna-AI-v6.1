import type {
  AgentEventType,
  AgentMessage,
  AgentRequest,
  AgentResponse,
  IAgentChannel,
  IAgentCommunicationBus,
  TypedAgentEvent,
  CommunicationLogEntry,
} from '@luna-ai/types';
import { AgentEventBus } from './AgentEventBus';
import { AgentChannel } from './AgentChannel';
import { AgentCommunicationLogger } from './AgentCommunicationLogger';
import { AgentLogger } from './AgentLogger';

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type TypedHandler<T extends AgentEventType = AgentEventType, D = unknown> =
  (event: TypedAgentEvent<T, D>) => void | Promise<void>;

interface PendingRequest {
  request: AgentRequest;
  resolve: (response: AgentResponse) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
  abortHandler?: () => void;
}

// ---------------------------------------------------------------------------
// AgentCommunicationBus
// ---------------------------------------------------------------------------

/**
 * AgentCommunicationBus — the central communication hub for Phase 6.4.
 *
 * Responsibilities:
 *  - Typed publish/subscribe with discriminated-union events
 *  - Wildcard (subscribeAll) listeners
 *  - Request/response with correlation IDs, configurable timeout, and
 *    AbortSignal-based cancellation
 *  - Per-agent channel management (inbox delivery)
 *  - Global message listeners
 *  - Full event history with time-range and per-agent filtering
 *  - Structured communication log via AgentCommunicationLogger
 *
 * Intentionally NOT responsible for:
 *  - Tool execution
 *  - Autonomous workflows
 *  - Parallel agent orchestration
 */
export class AgentCommunicationBus implements IAgentCommunicationBus {
  // Underlying low-level bus — still used for backward-compat legacy events
  private readonly legacyBus: AgentEventBus;

  // Typed subscriptions: eventType → set of handlers
  private readonly typedHandlers: Map<AgentEventType, Set<TypedHandler>>;

  // Wildcard handlers receive every event regardless of type
  private readonly wildcardHandlers: Set<TypedHandler>;

  // Global message listeners (fire-and-forget, no targeting)
  private readonly messageListeners: Set<(message: AgentMessage) => void>;

  // Per-agent channels (lazily created)
  private readonly channels: Map<string, AgentChannel>;

  // Pending request/response pairs keyed by requestId
  private readonly pendingRequests: Map<string, PendingRequest>;

  // Full typed event history
  private readonly eventHistory: TypedAgentEvent[];
  private readonly maxHistorySize: number;

  // Structured log
  private readonly commLogger: AgentCommunicationLogger;

  // ID generator counter
  private idCounter: number;

  constructor(
    legacyBus: AgentEventBus,
    agentLogger: AgentLogger,
    maxHistorySize = 2000,
  ) {
    this.legacyBus = legacyBus;
    this.typedHandlers = new Map();
    this.wildcardHandlers = new Set();
    this.messageListeners = new Set();
    this.channels = new Map();
    this.pendingRequests = new Map();
    this.eventHistory = [];
    this.maxHistorySize = maxHistorySize;
    this.commLogger = new AgentCommunicationLogger(agentLogger);
    this.idCounter = 0;
  }

  // ---------------------------------------------------------------------------
  // Typed pub / sub
  // ---------------------------------------------------------------------------

  async publish<T extends AgentEventType, D>(
    event: TypedAgentEvent<T, D>,
  ): Promise<void> {
    // Append to history
    this.appendHistory(event as TypedAgentEvent);

    // Log
    this.commLogger.logEvent(event as TypedAgentEvent);

    // Typed subscribers
    const handlers = this.typedHandlers.get(event.type as AgentEventType);
    if (handlers) {
      for (const handler of handlers) {
        try {
          await (handler as TypedHandler<T, D>)(event);
        } catch (err) {
          this.commLogger.error(
            event.type as AgentEventType,
            `Handler threw for event type "${event.type}"`,
            err instanceof Error ? err : new Error(String(err)),
            { sourceAgentId: event.sourceAgentId },
          );
        }
      }
    }

    // Wildcard subscribers
    for (const handler of this.wildcardHandlers) {
      try {
        await handler(event as TypedAgentEvent);
      } catch (err) {
        this.commLogger.error(
          event.type as AgentEventType,
          'Wildcard handler threw',
          err instanceof Error ? err : new Error(String(err)),
        );
      }
    }

    // If this is a response event, resolve the matching pending request
    if (event.type === 'response' && event.correlationId) {
      this.resolveRequest(
        event.correlationId,
        event as TypedAgentEvent<'response'>,
      );
    }

    // Route to target agent's channel when targetAgentId is set
    if (event.type === 'message' && event.targetAgentId) {
      const msgData = event.data as AgentMessage;
      const channel = this.getChannel(event.targetAgentId);
      channel.deliver(msgData);
    }

    // Bridge to legacy bus so existing OrchestratOr subscribers still fire
    await this.legacyBus.publish({
      id: event.id,
      type: this.toLegacyEventType(event.type as AgentEventType),
      sourceAgentId: event.sourceAgentId,
      targetAgentId: event.targetAgentId,
      taskId: event.taskId,
      timestamp: event.timestamp,
      data: event.data,
    });
  }

  subscribe<T extends AgentEventType, D>(
    eventType: T,
    handler: TypedHandler<T, D>,
  ): void {
    if (!this.typedHandlers.has(eventType)) {
      this.typedHandlers.set(eventType, new Set());
    }
    this.typedHandlers.get(eventType)!.add(handler as TypedHandler);
  }

  unsubscribe<T extends AgentEventType, D>(
    eventType: T,
    handler: TypedHandler<T, D>,
  ): void {
    this.typedHandlers.get(eventType)?.delete(handler as TypedHandler);
  }

  subscribeAll(handler: TypedHandler): void {
    this.wildcardHandlers.add(handler);
  }

  unsubscribeAll(handler: TypedHandler): void {
    this.wildcardHandlers.delete(handler);
  }

  // ---------------------------------------------------------------------------
  // Direct messaging
  // ---------------------------------------------------------------------------

  async sendMessage(message: AgentMessage): Promise<void> {
    // Deliver to the target's channel
    const channel = this.getChannel(message.to);
    channel.deliver(message);

    // Fire global listeners
    for (const listener of this.messageListeners) {
      try {
        listener(message);
      } catch (err) {
        this.commLogger.error(
          'message',
          'Message listener threw',
          err instanceof Error ? err : new Error(String(err)),
          { sourceAgentId: message.from, targetAgentId: message.to },
        );
      }
    }

    // Publish as a typed event so history + wildcard subs see it
    await this.publish<'message', AgentMessage>({
      id: this.nextId('msg'),
      type: 'message',
      sourceAgentId: message.from,
      targetAgentId: message.to,
      timestamp: message.timestamp,
      data: message,
    });

    this.commLogger.info('message', `Message from ${message.from} → ${message.to}`, {
      sourceAgentId: message.from,
      targetAgentId: message.to,
    });
  }

  onMessage(handler: (message: AgentMessage) => void): void {
    this.messageListeners.add(handler);
  }

  offMessage(handler: (message: AgentMessage) => void): void {
    this.messageListeners.delete(handler);
  }

  // ---------------------------------------------------------------------------
  // Request / Response
  // ---------------------------------------------------------------------------

  request(
    fromAgentId: string,
    toAgentId: string,
    payload: unknown,
    timeoutMs = 30_000,
    signal?: AbortSignal,
  ): Promise<AgentResponse> {
    const requestId = this.nextId('req');
    const sentAt = Date.now();

    return new Promise<AgentResponse>((resolve, reject) => {
      // Abort immediately if already cancelled
      if (signal?.aborted) {
        this.commLogger.warn('request', `Request ${requestId} aborted before send`, {
          sourceAgentId: fromAgentId,
          targetAgentId: toAgentId,
          correlationId: requestId,
        });
        reject(new Error(`Request ${requestId} was cancelled before it was sent`));
        return;
      }

      // Timeout guard
      const timer = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        this.commLogger.warn('request', `Request ${requestId} timed out after ${timeoutMs}ms`, {
          sourceAgentId: fromAgentId,
          targetAgentId: toAgentId,
          correlationId: requestId,
        });
        reject(new Error(`Request ${requestId} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      // AbortSignal handler
      let abortHandler: (() => void) | undefined;
      if (signal) {
        abortHandler = () => {
          clearTimeout(timer);
          this.pendingRequests.delete(requestId);
          this.commLogger.warn('request', `Request ${requestId} cancelled via AbortSignal`, {
            sourceAgentId: fromAgentId,
            targetAgentId: toAgentId,
            correlationId: requestId,
          });
          reject(new Error(`Request ${requestId} was cancelled`));
        };
        signal.addEventListener('abort', abortHandler, { once: true });
      }

      const pending: PendingRequest = {
        request: {
          requestId,
          fromAgentId,
          toAgentId,
          payload,
          deadlineMs: sentAt + timeoutMs,
          signal,
          timestamp: new Date(sentAt),
        },
        resolve: (response: AgentResponse) => {
          clearTimeout(timer);
          if (abortHandler && signal) {
            signal.removeEventListener('abort', abortHandler);
          }
          resolve(response);
        },
        reject: (reason: Error) => {
          clearTimeout(timer);
          if (abortHandler && signal) {
            signal.removeEventListener('abort', abortHandler);
          }
          reject(reason);
        },
        timer,
        abortHandler,
      };

      this.pendingRequests.set(requestId, pending);

      // Publish the request event — target agent receives it via its channel
      this.publish<'request', { requestId: string; payload: unknown; timeoutMs: number }>({
        id: this.nextId('evt'),
        type: 'request',
        sourceAgentId: fromAgentId,
        targetAgentId: toAgentId,
        correlationId: requestId,
        timestamp: new Date(sentAt),
        data: { requestId, payload, timeoutMs },
      }).catch(err => {
        this.commLogger.error(
          'request',
          `Failed to publish request event for ${requestId}`,
          err instanceof Error ? err : new Error(String(err)),
          { sourceAgentId: fromAgentId, targetAgentId: toAgentId, correlationId: requestId },
        );
      });

      this.commLogger.info('request', `Request ${requestId}: ${fromAgentId} → ${toAgentId}`, {
        sourceAgentId: fromAgentId,
        targetAgentId: toAgentId,
        correlationId: requestId,
      });
    });
  }

  async reply(
    fromAgentId: string,
    requestId: string,
    payload: unknown,
    success = true,
    error?: string,
  ): Promise<void> {
    const responseEvent: TypedAgentEvent<'response', {
      requestId: string;
      payload: unknown;
      success: boolean;
      error?: string;
    }> = {
      id: this.nextId('evt'),
      type: 'response',
      sourceAgentId: fromAgentId,
      correlationId: requestId,        // ← links back to the pending request
      timestamp: new Date(),
      data: { requestId, payload, success, error },
    };

    this.commLogger.info('response', `Reply for request ${requestId} from ${fromAgentId}`, {
      sourceAgentId: fromAgentId,
      correlationId: requestId,
    });

    await this.publish(responseEvent);
  }

  // ---------------------------------------------------------------------------
  // Channel management
  // ---------------------------------------------------------------------------

  getChannel(agentId: string): IAgentChannel {
    if (!this.channels.has(agentId)) {
      this.channels.set(agentId, new AgentChannel(agentId));
    }
    return this.channels.get(agentId)!;
  }

  // ---------------------------------------------------------------------------
  // History & introspection
  // ---------------------------------------------------------------------------

  getEventHistory(): TypedAgentEvent[] {
    return [...this.eventHistory];
  }

  getEventsByType<T extends AgentEventType>(type: T): TypedAgentEvent<T>[] {
    return this.eventHistory.filter(
      e => e.type === type,
    ) as TypedAgentEvent<T>[];
  }

  getEventsByAgent(agentId: string): TypedAgentEvent[] {
    return this.eventHistory.filter(
      e => e.sourceAgentId === agentId || e.targetAgentId === agentId,
    );
  }

  getEventsByTimeRange(from: Date, to: Date): TypedAgentEvent[] {
    const fromMs = from.getTime();
    const toMs = to.getTime();
    return this.eventHistory.filter(e => {
      const t = e.timestamp.getTime();
      return t >= fromMs && t <= toMs;
    });
  }

  getLog(): CommunicationLogEntry[] {
    return this.commLogger.getAll();
  }

  clearHistory(): void {
    this.eventHistory.length = 0;
  }

  // Convenience: delegate to underlying legacy bus history for callers that
  // still use the old AgentEvent shape
  getLegacyEventHistory() {
    return this.legacyBus.getEventHistory();
  }

  /** Number of requests currently awaiting a response. */
  pendingRequestCount(): number {
    return this.pendingRequests.size;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  dispose(): void {
    // Reject all pending requests
    for (const [requestId, pending] of this.pendingRequests.entries()) {
      clearTimeout(pending.timer);
      pending.reject(new Error(`CommunicationBus disposed — request ${requestId} cancelled`));
    }
    this.pendingRequests.clear();

    // Clear all channels
    for (const channel of this.channels.values()) {
      channel.clear();
    }
    this.channels.clear();

    // Clear subscriptions
    this.typedHandlers.clear();
    this.wildcardHandlers.clear();
    this.messageListeners.clear();

    // Clear history and log
    this.clearHistory();
    this.commLogger.clear();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private appendHistory(event: TypedAgentEvent): void {
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  private resolveRequest(
    correlationId: string,
    responseEvent: TypedAgentEvent<'response'>,
  ): void {
    const pending = this.pendingRequests.get(correlationId);
    if (!pending) return;

    this.pendingRequests.delete(correlationId);

    const { request } = pending;
    const latencyMs = Date.now() - request.timestamp.getTime();
    const data = responseEvent.data as {
      requestId: string;
      payload: unknown;
      success: boolean;
      error?: string;
    };

    const response: AgentResponse = {
      requestId: correlationId,
      fromAgentId: responseEvent.sourceAgentId ?? 'unknown',
      toAgentId: request.fromAgentId,
      payload: data.payload,
      success: data.success,
      error: data.error,
      latencyMs,
      timestamp: responseEvent.timestamp,
    };

    if (data.success) {
      pending.resolve(response);
    } else {
      pending.reject(
        new Error(data.error ?? `Request ${correlationId} failed with no error message`),
      );
    }
  }

  /**
   * Maps typed event types to the 7-literal union used by the legacy AgentEvent.
   * Unknown types fall back to 'message'.
   */
  private toLegacyEventType(
    type: AgentEventType,
  ): 'agent_started' | 'agent_completed' | 'agent_failed' | 'agent_cancelled' | 'task_created' | 'task_completed' | 'task_failed' | 'message' {
    switch (type) {
      case 'agent_started':   return 'agent_started';
      case 'agent_completed': return 'agent_completed';
      case 'agent_failed':    return 'agent_failed';
      case 'agent_cancelled': return 'agent_cancelled';
      case 'task_created':    return 'task_created';
      case 'task_completed':  return 'task_completed';
      case 'task_failed':     return 'task_failed';
      default:                return 'message';
    }
  }

  private nextId(prefix: string): string {
    return `${prefix}-${Date.now()}-${++this.idCounter}`;
  }
}
