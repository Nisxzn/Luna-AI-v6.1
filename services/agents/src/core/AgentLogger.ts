export interface LogEntry {
  timestamp: string;
  agentName: string;
  agentId: string;
  eventType: string;
  logLevel: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

export class AgentLogger {
  private prefix: string;
  private agentName: string;
  private logHistory: LogEntry[];
  private maxHistorySize: number;

  constructor(agentName = 'Agent', prefix = '[Agent]', maxHistorySize = 1000) {
    this.agentName = agentName;
    this.prefix = prefix;
    this.logHistory = [];
    this.maxHistorySize = maxHistorySize;
  }

  private createLogEntry(
    agentId: string,
    logLevel: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG',
    message: string,
    eventType: string,
    metadata?: Record<string, unknown>,
    error?: Error
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      agentName: this.agentName,
      agentId,
      eventType,
      logLevel,
      message,
      metadata,
      error: error?.message,
    };
  }

  private addToHistory(entry: LogEntry): void {
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
  }

  info(agentId: string, message: string, eventType = 'general', metadata?: Record<string, unknown>): void {
    const entry = this.createLogEntry(agentId, 'INFO', message, eventType, metadata);
    this.addToHistory(entry);
    const metaStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
    console.log(`${entry.timestamp} ${this.prefix} [${this.agentName}:${agentId}] INFO [${eventType}]: ${message}${metaStr}`);
  }

  error(agentId: string, message: string, eventType = 'error', error?: Error, metadata?: Record<string, unknown>): void {
    const entry = this.createLogEntry(agentId, 'ERROR', message, eventType, metadata, error);
    this.addToHistory(entry);
    const errorStr = error ? ` ${error.message}` : '';
    const metaStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
    console.error(`${entry.timestamp} ${this.prefix} [${this.agentName}:${agentId}] ERROR [${eventType}]: ${message}${errorStr}${metaStr}`);
  }

  warn(agentId: string, message: string, eventType = 'warning', metadata?: Record<string, unknown>): void {
    const entry = this.createLogEntry(agentId, 'WARN', message, eventType, metadata);
    this.addToHistory(entry);
    const metaStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
    console.warn(`${entry.timestamp} ${this.prefix} [${this.agentName}:${agentId}] WARN [${eventType}]: ${message}${metaStr}`);
  }

  debug(agentId: string, message: string, eventType = 'debug', metadata?: Record<string, unknown>): void {
    const entry = this.createLogEntry(agentId, 'DEBUG', message, eventType, metadata);
    this.addToHistory(entry);
    const metaStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
    console.debug(`${entry.timestamp} ${this.prefix} [${this.agentName}:${agentId}] DEBUG [${eventType}]: ${message}${metaStr}`);
  }

  getHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  getHistoryByAgentId(agentId: string): LogEntry[] {
    return this.logHistory.filter(entry => entry.agentId === agentId);
  }

  getHistoryByLogLevel(logLevel: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'): LogEntry[] {
    return this.logHistory.filter(entry => entry.logLevel === logLevel);
  }

  clearHistory(): void {
    this.logHistory = [];
  }

  setAgentName(name: string): void {
    this.agentName = name;
  }
}
