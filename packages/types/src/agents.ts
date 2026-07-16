// Multi-Agent System Types
import type { TaskPriority, Task, TaskPlan } from './tasks';

export type AgentCategory = 'development' | 'workspace' | 'ai' | 'planning';

export type AgentStatus = 'idle' | 'busy' | 'error' | 'cancelled';

export enum AgentState {
  Idle = 'idle',
  Initializing = 'initializing',
  Ready = 'ready',
  Running = 'running',
  Waiting = 'waiting',
  Paused = 'paused',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

// Re-export task types for backward compatibility
export type { TaskPriority, Task, TaskPlan } from './tasks';

export interface AgentCapability {
  name: string;
  description: string;
  inputTypes: string[];
  outputTypes: string[];
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  category: AgentCategory;
  capabilities: AgentCapability[];
  supportedTools: string[];
  maxRetries: number;
  timeout: number;
  enabled: boolean;
}

export interface AgentContext {
  workspaceId?: string;
  projectId?: string;
  sessionId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  // Integration placeholders
  workspace?: unknown;
  memory?: unknown;
  rag?: unknown;
  chat?: unknown;
  toolEngine?: unknown;
  activeFile?: string;
  userRequest?: string;
  configuration?: Record<string, unknown>;
}

export interface AgentInput {
  type: string;
  data: unknown;
  metadata?: Record<string, unknown>;
}

export interface AgentOutput {
  type: string;
  data: unknown;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface AgentExecutionResult {
  agentId: string;
  taskId: string;
  output: AgentOutput;
  executionTime: number;
  timestamp: Date;
}

export interface AgentEvent {
  id: string;
  type: 'agent_started' | 'agent_completed' | 'agent_failed' | 'agent_cancelled' | 'task_created' | 'task_completed' | 'task_failed' | 'message';
  sourceAgentId?: string;
  targetAgentId?: string;
  taskId?: string;
  timestamp: Date;
  data: unknown;
}

export interface AgentMessage {
  from: string;
  to: string;
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface RetryPolicy {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface AgentMetrics {
  agentId: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  lastExecutionTime?: Date;
  currentStatus: AgentStatus;
  activeDuration?: number;
}

export interface AgentRegistryEntry {
  config: AgentConfig;
  instance: BaseAgent;
  metrics: AgentMetrics;
  registeredAt: Date;
}

export interface ToolExecutionContext {
  toolName: string;
  parameters: Record<string, unknown>;
  agentId: string;
  taskId: string;
  context: AgentContext;
}

export interface ToolExecutionResult {
  success: boolean;
  result?: unknown;
  error?: string;
  executionTime: number;
}

// Base Agent Interface
export interface BaseAgent {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly version: string;
  readonly category: AgentCategory;
  readonly capabilities: AgentCapability[];
  readonly supportedTools: string[];
  readonly supportedModels: string[];
  readonly status: AgentState;
  readonly priority: TaskPriority;

  initialize(): Promise<void>;
  execute(input: AgentInput, context: AgentContext): Promise<AgentOutput>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  cancel(taskId: string): Promise<boolean>;
  dispose(): Promise<void>;
  validate(input: AgentInput): Promise<boolean>;
  getStatus(): AgentState;
  getConfig(): AgentConfig;
}

export interface AgentManager {
  registerAgent(agent: BaseAgent, config: AgentConfig): Promise<void>;
  unregisterAgent(agentId: string): Promise<void>;
  getAgent(agentId: string): Promise<BaseAgent | null>;
  listAgents(category?: AgentCategory): Promise<BaseAgent[]>;
  getAgentMetrics(agentId: string): Promise<AgentMetrics | null>;
}

export interface AgentRegistry {
  register(entry: AgentRegistryEntry): Promise<void>;
  unregister(agentId: string): Promise<void>;
  get(agentId: string): Promise<AgentRegistryEntry | null>;
  list(category?: AgentCategory): Promise<AgentRegistryEntry[]>;
  exists(agentId: string): Promise<boolean>;
}

export interface AgentOrchestrator {
  planTask(request: string, context: AgentContext): Promise<TaskPlan>;
  executeTask(task: Task): Promise<AgentExecutionResult>;
  executePlan(plan: TaskPlan): Promise<AgentExecutionResult[]>;
  cancelTask(taskId: string): Promise<boolean>;
  getTaskStatus(taskId: string): Promise<Task | null>;
}

export interface TaskPlanner {
  analyzeRequest(request: string, context: AgentContext): Promise<TaskPlan>;
  estimateComplexity(request: string): Promise<number>;
  decomposeTask(task: Task): Promise<Task[]>;
}

export interface TaskQueue {
  enqueue(task: Task): Promise<void>;
  dequeue(): Promise<Task | null>;
  peek(): Promise<Task | null>;
  remove(taskId: string): Promise<boolean>;
  size(): Promise<number>;
  clear(): Promise<void>;
}

export interface AgentRouter {
  route(task: Task): Promise<string>;
  getBestAgent(taskType: string, context: AgentContext): Promise<string | null>;
  updateAgentMetrics(agentId: string, success: boolean, executionTime: number): Promise<void>;
}

export interface AgentMemoryAdapter {
  getContext(context: AgentContext): Promise<string>;
  saveContext(context: AgentContext, data: string): Promise<void>;
  searchContext(query: string, context: AgentContext): Promise<string[]>;
}

export interface AgentToolAdapter {
  executeTool(context: ToolExecutionContext): Promise<ToolExecutionResult>;
  getAvailableTools(agentId: string): Promise<string[]>;
  validateToolAccess(agentId: string, toolName: string): Promise<boolean>;
}

export interface AgentEventBus {
  publish(event: AgentEvent): Promise<void>;
  subscribe(eventType: string, handler: (event: AgentEvent) => void): void;
  unsubscribe(eventType: string, handler: (event: AgentEvent) => void): void;
  sendMessage(message: AgentMessage): Promise<void>;
  onMessage(handler: (message: AgentMessage) => void): void;
}

export interface AgentLogger {
  info(agentId: string, message: string, metadata?: Record<string, unknown>): void;
  error(agentId: string, message: string, error?: Error, metadata?: Record<string, unknown>): void;
  warn(agentId: string, message: string, metadata?: Record<string, unknown>): void;
  debug(agentId: string, message: string, metadata?: Record<string, unknown>): void;
}

export interface AgentStateManager {
  getCurrentState(agentId: string): AgentState;
  setState(agentId: string, state: AgentState): void;
  canTransition(from: AgentState, to: AgentState): boolean;
  getStateHistory(agentId: string): AgentState[];
}

export interface AgentLifecycleManager {
  register(agent: BaseAgent): Promise<void>;
  initialize(agentId: string): Promise<void>;
  activate(agentId: string): Promise<void>;
  execute(agentId: string, input: AgentInput, context: AgentContext): Promise<AgentOutput>;
  pause(agentId: string): Promise<void>;
  resume(agentId: string): Promise<void>;
  cancel(agentId: string, taskId: string): Promise<boolean>;
  shutdown(agentId: string): Promise<void>;
}

export interface AgentFactory {
  createAgent(config: AgentConfig): BaseAgent;
  createAgentFromType(type: string, config: AgentConfig): BaseAgent;
  registerAgentType(type: string, constructor: new (config: AgentConfig) => BaseAgent): void;
  getAvailableTypes(): string[];
}

export interface AgentExceptionHandler {
  handle(error: Error, agentId: string, context: AgentContext): Promise<void>;
  registerHandler(errorType: string, handler: (error: Error, agentId: string, context: AgentContext) => Promise<void>): void;
  getLastError(agentId: string): Error | null;
}

export interface AgentConfiguration {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  getAll(): Record<string, unknown>;
  validate(): boolean;
}

// =============================================================================
// Phase 6.4 — Agent Communication System
// =============================================================================

// ---------------------------------------------------------------------------
// Typed event discriminated union
// ---------------------------------------------------------------------------

/** All event type literals used by the communication system. */
export type AgentEventType =
  // Lifecycle
  | 'agent_started'
  | 'agent_completed'
  | 'agent_failed'
  | 'agent_cancelled'
  // Tasks
  | 'task_created'
  | 'task_completed'
  | 'task_failed'
  // Messaging
  | 'message'
  // Request/Response
  | 'request'
  | 'response'
  // System
  | 'error'
  | 'heartbeat';

/** Base shape every typed event must satisfy. */
export interface TypedAgentEvent<
  T extends AgentEventType = AgentEventType,
  D = unknown,
> {
  /** Unique event identifier. */
  id: string;
  /** Discriminant — narrows the data payload type. */
  type: T;
  sourceAgentId?: string;
  targetAgentId?: string;
  taskId?: string;
  timestamp: Date;
  /** Correlation id — links a response back to its originating request. */
  correlationId?: string;
  /** Whether the event has been cancelled. */
  cancelled?: boolean;
  data: D;
}

// Concrete typed event variants

export interface AgentLifecycleEvent
  extends TypedAgentEvent<
    'agent_started' | 'agent_completed' | 'agent_failed' | 'agent_cancelled',
    { agentId: string; reason?: string }
  > {}

export interface AgentTaskEvent
  extends TypedAgentEvent<
    'task_created' | 'task_completed' | 'task_failed',
    { taskId: string; taskType?: string; error?: string }
  > {}

export interface AgentMessageEvent
  extends TypedAgentEvent<
    'message',
    AgentMessage
  > {}

export interface AgentRequestEvent
  extends TypedAgentEvent<
    'request',
    {
      requestId: string;
      payload: unknown;
      timeoutMs: number;
    }
  > {}

export interface AgentResponseEvent
  extends TypedAgentEvent<
    'response',
    {
      requestId: string;
      payload: unknown;
      success: boolean;
      error?: string;
    }
  > {}

export interface AgentErrorEvent
  extends TypedAgentEvent<
    'error',
    { message: string; stack?: string; context?: Record<string, unknown> }
  > {}

export interface AgentHeartbeatEvent
  extends TypedAgentEvent<
    'heartbeat',
    { agentId: string; status: AgentStatus; timestamp: Date }
  > {}

// ---------------------------------------------------------------------------
// Request / Response
// ---------------------------------------------------------------------------

/** A pending request waiting for a correlated response. */
export interface AgentRequest {
  /** Unique request identifier — becomes the correlationId on the response. */
  requestId: string;
  fromAgentId: string;
  toAgentId: string;
  payload: unknown;
  /** Absolute deadline (ms since epoch). */
  deadlineMs: number;
  /** AbortSignal passed in by the caller for cancellation. */
  signal?: AbortSignal;
  timestamp: Date;
}

/** The resolved value returned to the caller of `request()`. */
export interface AgentResponse {
  requestId: string;
  fromAgentId: string;
  toAgentId: string;
  payload: unknown;
  success: boolean;
  error?: string;
  latencyMs: number;
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// Channel
// ---------------------------------------------------------------------------

/** A logical per-agent inbox/outbox for targeted, queued communication. */
export interface AgentChannelEntry {
  message: AgentMessage;
  receivedAt: Date;
  read: boolean;
}

export interface IAgentChannel {
  readonly agentId: string;
  /** Deliver a message into this channel's inbox. */
  deliver(message: AgentMessage): void;
  /** Read the next unread message, or null if the inbox is empty. */
  receive(): AgentMessage | null;
  /** Drain all unread messages. */
  drain(): AgentMessage[];
  /** Register a callback invoked whenever a new message arrives. */
  onReceive(handler: (message: AgentMessage) => void): void;
  /** Remove a previously registered receive handler. */
  offReceive(handler: (message: AgentMessage) => void): void;
  /** Number of unread messages in the inbox. */
  pendingCount(): number;
  /** Clear the inbox. */
  clear(): void;
}

// ---------------------------------------------------------------------------
// Communication Log
// ---------------------------------------------------------------------------

export type CommunicationLogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface CommunicationLogEntry {
  id: string;
  timestamp: Date;
  level: CommunicationLogLevel;
  eventType: AgentEventType;
  sourceAgentId?: string;
  targetAgentId?: string;
  correlationId?: string;
  message: string;
  data?: unknown;
  error?: string;
}

// ---------------------------------------------------------------------------
// Communication Bus interface
// ---------------------------------------------------------------------------

export interface IAgentCommunicationBus {
  // ---- Typed pub/sub -------------------------------------------------------
  /** Publish a typed event to all subscribers of its type. */
  publish<T extends AgentEventType, D>(
    event: TypedAgentEvent<T, D>,
  ): Promise<void>;

  /** Subscribe to events of a specific type. */
  subscribe<T extends AgentEventType, D>(
    eventType: T,
    handler: (event: TypedAgentEvent<T, D>) => void | Promise<void>,
  ): void;

  /** Unsubscribe a handler. */
  unsubscribe<T extends AgentEventType, D>(
    eventType: T,
    handler: (event: TypedAgentEvent<T, D>) => void | Promise<void>,
  ): void;

  /** Subscribe to ALL event types (wildcard). */
  subscribeAll(
    handler: (event: TypedAgentEvent) => void | Promise<void>,
  ): void;

  /** Remove a wildcard subscriber. */
  unsubscribeAll(
    handler: (event: TypedAgentEvent) => void | Promise<void>,
  ): void;

  // ---- Direct messaging ---------------------------------------------------
  /** Send a message directly to a target agent's channel. */
  sendMessage(message: AgentMessage): Promise<void>;

  /** Register a global message listener (receives all messages). */
  onMessage(handler: (message: AgentMessage) => void): void;

  /** Remove a global message listener. */
  offMessage(handler: (message: AgentMessage) => void): void;

  // ---- Request / Response -------------------------------------------------
  /**
   * Send a request to a target agent and await a correlated response.
   * Rejects on timeout or if the provided AbortSignal fires.
   */
  request(
    fromAgentId: string,
    toAgentId: string,
    payload: unknown,
    timeoutMs?: number,
    signal?: AbortSignal,
  ): Promise<AgentResponse>;

  /**
   * Reply to an inbound request identified by its requestId.
   * The reply is routed back to the original caller via correlationId.
   */
  reply(
    fromAgentId: string,
    requestId: string,
    payload: unknown,
    success?: boolean,
    error?: string,
  ): Promise<void>;

  // ---- Channel management -------------------------------------------------
  /** Get (or lazily create) the channel for an agent. */
  getChannel(agentId: string): IAgentChannel;

  // ---- History & introspection -------------------------------------------
  /** Full event history, newest-last. */
  getEventHistory(): TypedAgentEvent[];

  /** Events filtered by type. */
  getEventsByType<T extends AgentEventType>(type: T): TypedAgentEvent<T>[];

  /** Events involving a specific agent (source or target). */
  getEventsByAgent(agentId: string): TypedAgentEvent[];

  /** Events in a time window. */
  getEventsByTimeRange(from: Date, to: Date): TypedAgentEvent[];

  /** Communication log entries. */
  getLog(): CommunicationLogEntry[];

  /** Clear event history (does not affect subscriptions). */
  clearHistory(): void;

  // ---- Lifecycle ----------------------------------------------------------
  dispose(): void;
}
