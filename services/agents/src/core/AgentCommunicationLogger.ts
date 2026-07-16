import type {
  AgentEventType,
  CommunicationLogEntry,
  CommunicationLogLevel,
  TypedAgentEvent,
} from '@luna-ai/types';
import { AgentLogger } from './AgentLogger';

/**
 * AgentCommunicationLogger — structured log for all communication-layer events.
 *
 * Every entry has a stable id, timestamp, level, and the key event fields so
 * consumers can filter/query without parsing free-form strings.  Entries are
 * also forwarded to the shared AgentLogger so they appear in the same console
 * stream as lifecycle logs.
 */
export class AgentCommunicationLogger {
  private readonly entries: CommunicationLogEntry[];
  private readonly maxSize: number;
  private readonly agentLogger: AgentLogger;
  private entryCounter: number;

  constructor(agentLogger: AgentLogger, maxSize = 2000) {
    this.entries = [];
    this.maxSize = maxSize;
    this.agentLogger = agentLogger;
    this.entryCounter = 0;
  }

  // ---------------------------------------------------------------------------
  // Core logging methods
  // ---------------------------------------------------------------------------

  info(
    eventType: AgentEventType,
    message: string,
    opts: LogOpts = {},
  ): void {
    this.append('info', eventType, message, opts);
    this.agentLogger.info(
      opts.sourceAgentId ?? 'comm-bus',
      message,
      'communication',
      this.buildMeta(eventType, opts),
    );
  }

  warn(
    eventType: AgentEventType,
    message: string,
    opts: LogOpts = {},
  ): void {
    this.append('warn', eventType, message, opts);
    this.agentLogger.warn(
      opts.sourceAgentId ?? 'comm-bus',
      message,
      'communication',
      this.buildMeta(eventType, opts),
    );
  }

  error(
    eventType: AgentEventType,
    message: string,
    err?: Error,
    opts: LogOpts = {},
  ): void {
    this.append('error', eventType, message, opts, err?.message);
    this.agentLogger.error(
      opts.sourceAgentId ?? 'comm-bus',
      message,
      'communication',
      err,
      this.buildMeta(eventType, opts),
    );
  }

  debug(
    eventType: AgentEventType,
    message: string,
    opts: LogOpts = {},
  ): void {
    this.append('debug', eventType, message, opts);
    this.agentLogger.debug(
      opts.sourceAgentId ?? 'comm-bus',
      message,
      'communication',
      this.buildMeta(eventType, opts),
    );
  }

  /**
   * Log a typed event automatically — derives level and message from the event.
   */
  logEvent(event: TypedAgentEvent): void {
    const level = this.levelForEventType(event.type);
    const message = `[${event.type}] src=${event.sourceAgentId ?? '-'} tgt=${event.targetAgentId ?? '-'}`;
    this.append(level, event.type, message, {
      sourceAgentId: event.sourceAgentId,
      targetAgentId: event.targetAgentId,
      correlationId: event.correlationId,
      data: event.data,
    });
  }

  // ---------------------------------------------------------------------------
  // Query
  // ---------------------------------------------------------------------------

  getAll(): CommunicationLogEntry[] {
    return [...this.entries];
  }

  getByLevel(level: CommunicationLogLevel): CommunicationLogEntry[] {
    return this.entries.filter(e => e.level === level);
  }

  getByEventType(eventType: AgentEventType): CommunicationLogEntry[] {
    return this.entries.filter(e => e.eventType === eventType);
  }

  getByAgent(agentId: string): CommunicationLogEntry[] {
    return this.entries.filter(
      e => e.sourceAgentId === agentId || e.targetAgentId === agentId,
    );
  }

  getByCorrelationId(correlationId: string): CommunicationLogEntry[] {
    return this.entries.filter(e => e.correlationId === correlationId);
  }

  getByTimeRange(from: Date, to: Date): CommunicationLogEntry[] {
    const fromMs = from.getTime();
    const toMs = to.getTime();
    return this.entries.filter(e => {
      const t = e.timestamp.getTime();
      return t >= fromMs && t <= toMs;
    });
  }

  getErrors(): CommunicationLogEntry[] {
    return this.getByLevel('error');
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  clear(): void {
    this.entries.length = 0;
  }

  size(): number {
    return this.entries.length;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private append(
    level: CommunicationLogLevel,
    eventType: AgentEventType,
    message: string,
    opts: LogOpts,
    errorMsg?: string,
  ): void {
    const entry: CommunicationLogEntry = {
      id: `comm-log-${++this.entryCounter}`,
      timestamp: new Date(),
      level,
      eventType,
      sourceAgentId: opts.sourceAgentId,
      targetAgentId: opts.targetAgentId,
      correlationId: opts.correlationId,
      message,
      data: opts.data,
      error: errorMsg,
    };

    this.entries.push(entry);

    if (this.entries.length > this.maxSize) {
      this.entries.shift();
    }
  }

  private buildMeta(
    eventType: AgentEventType,
    opts: LogOpts,
  ): Record<string, unknown> {
    return {
      eventType,
      ...(opts.targetAgentId ? { targetAgentId: opts.targetAgentId } : {}),
      ...(opts.correlationId ? { correlationId: opts.correlationId } : {}),
    };
  }

  private levelForEventType(type: AgentEventType): CommunicationLogLevel {
    switch (type) {
      case 'agent_failed':
      case 'task_failed':
      case 'error':
        return 'error';
      case 'agent_cancelled':
        return 'warn';
      case 'heartbeat':
        return 'debug';
      default:
        return 'info';
    }
  }
}

// ---------------------------------------------------------------------------
// Internal helper type (not exported — only used within this file)
// ---------------------------------------------------------------------------

interface LogOpts {
  sourceAgentId?: string;
  targetAgentId?: string;
  correlationId?: string;
  data?: unknown;
}
