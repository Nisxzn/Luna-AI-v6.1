// Task Orchestrator Types

export enum TaskState {
  Pending = 'pending',
  Planned = 'planned',
  Queued = 'queued',
  Running = 'running',
  Waiting = 'waiting',
  Completed = 'completed',
  Failed = 'failed',
  Cancelled = 'cancelled',
  Timeout = 'timeout',
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export type TaskType = 'code_generation' | 'debugging' | 'testing' | 'documentation' | 'refactoring' | 'search' | 'analysis' | 'general';

export interface TaskMetadata {
  [key: string]: unknown;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskState;
  createdAt: Date;
  updatedAt: Date;
  timeout: number;
  retries: number;
  maxRetries: number;
  dependencies: string[];
  assignedAgent?: string;
  estimatedTokens: number;
  metadata: TaskMetadata;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  cancelledAt?: Date;
  parentTaskId?: string;
  subtaskIds?: string[];
  input: unknown;
  output?: unknown;
  error?: string;
}

export interface TaskPlan {
  tasks: Task[];
  executionOrder: string[];
  estimatedDuration: number;
  estimatedTokens: number;
  requiredCapabilities: string[];
}

export interface TaskExecutionResult {
  taskId: string;
  success: boolean;
  output?: unknown;
  error?: string;
  executionTime: number;
  tokensUsed: number;
  timestamp: Date;
}

export interface TaskDependency {
  taskId: string;
  dependsOn: string;
  type: 'sequential' | 'parallel' | 'conditional';
}

export interface TaskRetryPolicy {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface TaskTimeoutPolicy {
  defaultTimeout: number;
  maxTimeout: number;
  timeoutPerType: Record<TaskType, number>;
}

export interface TaskQueueMetrics {
  totalTasks: number;
  pendingTasks: number;
  runningTasks: number;
  completedTasks: number;
  failedTasks: number;
  cancelledTasks: number;
  averageWaitTime: number;
  averageExecutionTime: number;
}

export interface TaskMetrics {
  totalTasks: number;
  successfulTasks: number;
  failedTasks: number;
  cancelledTasks: number;
  timeoutTasks: number;
  successRate: number;
  failureRate: number;
  averageExecutionTime: number;
  queueSize: number;
  agentUtilization: Record<string, number>;
  tasksByType: Record<TaskType, number>;
  tasksByPriority: Record<TaskPriority, number>;
}

export interface TaskLogEntry {
  timestamp: Date;
  taskId: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  status?: TaskState;
  assignedAgent?: string;
  executionDuration?: number;
  error?: string;
  metadata?: TaskMetadata;
}

export interface TaskSchedulerConfig {
  maxConcurrentTasks: number;
  enableDependencyResolution: boolean;
  enablePriorityScheduling: boolean;
  enableTimeoutHandling: boolean;
}

export interface TaskRouterConfig {
  enableAgentSelection: boolean;
  enableCapabilityMatching: boolean;
  enableLoadBalancing: boolean;
}

export interface TaskExecutorConfig {
  enableRetries: boolean;
  enableTimeouts: boolean;
  enableErrorHandling: boolean;
  retryPolicy: TaskRetryPolicy;
  timeoutPolicy: TaskTimeoutPolicy;
}

export interface TaskManagerConfig {
  scheduler: TaskSchedulerConfig;
  router: TaskRouterConfig;
  executor: TaskExecutorConfig;
}

// State transition rules
export const TASK_STATE_TRANSITIONS: Record<TaskState, TaskState[]> = {
  [TaskState.Pending]: [TaskState.Planned, TaskState.Cancelled],
  [TaskState.Planned]: [TaskState.Queued, TaskState.Cancelled],
  [TaskState.Queued]: [TaskState.Running, TaskState.Cancelled],
  [TaskState.Running]: [TaskState.Waiting, TaskState.Completed, TaskState.Failed, TaskState.Cancelled, TaskState.Timeout],
  [TaskState.Waiting]: [TaskState.Running, TaskState.Cancelled, TaskState.Timeout],
  [TaskState.Completed]: [],
  [TaskState.Failed]: [TaskState.Pending, TaskState.Cancelled],
  [TaskState.Cancelled]: [],
  [TaskState.Timeout]: [TaskState.Pending, TaskState.Cancelled],
};

// Priority order for queue processing
export const TASK_PRIORITY_ORDER: TaskPriority[] = ['critical', 'high', 'medium', 'low'];

// Default retry policy
export const DEFAULT_RETRY_POLICY: TaskRetryPolicy = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableErrors: ['TimeoutError', 'NetworkError', 'RateLimitError'],
};

// Default timeout policy
export const DEFAULT_TIMEOUT_POLICY: TaskTimeoutPolicy = {
  defaultTimeout: 30000,
  maxTimeout: 300000,
  timeoutPerType: {
    code_generation: 60000,
    debugging: 90000,
    testing: 120000,
    documentation: 45000,
    refactoring: 90000,
    search: 30000,
    analysis: 60000,
    general: 30000,
  },
};
