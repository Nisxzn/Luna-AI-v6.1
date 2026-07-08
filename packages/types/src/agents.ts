// Multi-Agent System Types

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

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

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

export interface Task {
  id: string;
  type: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  input: AgentInput;
  context: AgentContext;
  assignedAgentId?: string;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  retryCount: number;
  maxRetries: number;
  timeout: number;
  dependencies?: string[];
  parentTaskId?: string;
}

export interface TaskPlan {
  tasks: Task[];
  executionOrder: string[];
  estimatedDuration: number;
  requiredAgents: string[];
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
