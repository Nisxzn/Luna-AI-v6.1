/**
 * context.ts — Shared Context System types (Phase 6.5)
 *
 * Defines the unified SharedContext object that flows through every agent,
 * task, and orchestration step.  Each sub-system contributes one typed
 * "slice"; the slices are assembled by SharedContextBuilder and managed
 * by SharedContextManager.
 */

import type { Memory, MemoryCategory } from './memory';
import type { RAGContext, RetrievalResult } from './rag';

// =============================================================================
// Token budget
// =============================================================================

export interface TokenBudget {
  /** Hard limit — context must not exceed this. */
  maxTokens: number;
  /** Tokens already consumed by the assembled context. */
  usedTokens: number;
  /** Remaining headroom. */
  remainingTokens: number;
  /** Per-slice allocation map (slice name → max tokens for that slice). */
  sliceAllocation: Record<ContextSliceName, number>;
}

// =============================================================================
// Slice names
// =============================================================================

export type ContextSliceName =
  | 'workspace'
  | 'editor'
  | 'chat'
  | 'memory'
  | 'rag'
  | 'tool'
  | 'applicationState';

// =============================================================================
// Individual slices
// =============================================================================

/** File / directory item in the workspace tree. */
export interface WorkspaceFileItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  language?: string;
  children?: WorkspaceFileItem[];
}

/** Workspace slice — paths, open files, file tree, metadata. */
export interface WorkspaceContextSlice {
  workspaceId: string;
  workspacePath: string | null;
  projectId?: string;
  activeFile: string | null;
  openFiles: string[];
  recentFiles: string[];
  fileTree: WorkspaceFileItem[];
  metadata: {
    name: string;
    totalFiles: number;
    totalDirectories: number;
    languages: string[];
  };
}

/** Diagnostic entry from the editor. */
export interface EditorDiagnostic {
  message: string;
  severity: 'error' | 'warning' | 'info' | 'hint';
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

/** Editor slice — active file state, cursor, selection, diagnostics. */
export interface EditorContextSlice {
  filePath: string | null;
  language: string;
  /** Full file content (may be truncated to fit the token budget). */
  content: string;
  selection: {
    text: string;
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
  } | null;
  cursorPosition: { line: number; column: number } | null;
  visibleRange: { startLine: number; endLine: number } | null;
  currentLine: string | null;
  diagnostics: EditorDiagnostic[];
}

/** A single chat message inside the chat slice. */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

/** Chat slice — conversation history and the current user request. */
export interface ChatContextSlice {
  sessionId: string;
  conversationId: string;
  /** Most-recent messages, newest-last, truncated to token budget. */
  messages: ChatMessage[];
  /** The raw user request that triggered the current agent invocation. */
  userRequest: string;
  /** System prompt override, if any. */
  systemPrompt?: string;
}

/** A summarised memory entry for the context object. */
export interface MemoryEntry {
  id: string;
  title: string;
  content: string;
  category: MemoryCategory;
  importance: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
  relevanceScore?: number;
}

/** Memory slice — retrieved and ranked memories relevant to the request. */
export interface MemoryContextSlice {
  entries: MemoryEntry[];
  /** Pre-formatted string ready to inject into a prompt. */
  assembledText: string;
  tokenCount: number;
  /** Whether memories were truncated to fit the budget. */
  truncated: boolean;
  retrievedAt: Date;
}

/** RAG slice — documents retrieved from the vector store. */
export interface RAGContextSlice {
  query: string;
  results: RetrievalResult[];
  /** Pre-formatted string ready to inject into a prompt. */
  assembledText: string;
  tokenCount: number;
  truncated: boolean;
  retrievedAt: Date;
  metadata: {
    totalDocuments: number;
    averageScore: number;
    retrievalTimeMs: number;
  };
}

/** A tool available to the agent in this context window. */
export interface AvailableTool {
  name: string;
  description: string;
  /** JSON-schema-style parameter description. */
  parameters: Record<string, unknown>;
  requiresPermission: boolean;
  permitted: boolean;
}

/** Tool slice — permitted tools and any pending results. */
export interface ToolContextSlice {
  availableTools: AvailableTool[];
  /** Results from tools that already ran earlier in this task. */
  executionHistory: Array<{
    toolName: string;
    parameters: Record<string, unknown>;
    result: unknown;
    success: boolean;
    executedAt: Date;
  }>;
}

/** High-level application / agent runtime state. */
export interface ApplicationStateSlice {
  /** Which agent is currently handling the request. */
  activeAgentId: string | null;
  activeTaskId: string | null;
  /** Model identifier being used for this invocation. */
  model: string;
  /** Provider — e.g. 'openai' | 'anthropic' | 'ollama'. */
  provider: string;
  temperature?: number;
  maxResponseTokens?: number;
  userId?: string;
  configuration: Record<string, unknown>;
}

// =============================================================================
// The unified SharedContext
// =============================================================================

/**
 * SharedContext — the single authoritative context object passed to every
 * agent.  All fields are optional so agents only consume what they need.
 */
export interface SharedContext {
  /** Stable id for this context snapshot (changes on each full rebuild). */
  id: string;
  /** When this snapshot was created. */
  createdAt: Date;
  /** When any slice was last updated. */
  updatedAt: Date;

  // ---- Slices --------------------------------------------------------------
  workspace?: WorkspaceContextSlice;
  editor?: EditorContextSlice;
  chat?: ChatContextSlice;
  memory?: MemoryContextSlice;
  rag?: RAGContextSlice;
  tool?: ToolContextSlice;
  applicationState?: ApplicationStateSlice;

  // ---- Token accounting ---------------------------------------------------
  tokenBudget: TokenBudget;

  // ---- Pre-assembled prompt string ----------------------------------------
  /**
   * Token-budgeted, ready-to-use context string for injection into a
   * model prompt.  Built by SharedContextBuilder.
   */
  assembledContext: string;

  // ---- Validation ---------------------------------------------------------
  isValid: boolean;
  validationErrors: string[];

  // ---- Arbitrary pass-through metadata -----------------------------------
  metadata: Record<string, unknown>;
}

// =============================================================================
// Update payload
// =============================================================================

/**
 * A partial update to one or more slices.  Passed to
 * IContextManager.update() — only the provided keys are merged.
 */
export interface SharedContextUpdate {
  workspace?: Partial<WorkspaceContextSlice>;
  editor?: Partial<EditorContextSlice>;
  chat?: Partial<ChatContextSlice>;
  memory?: Partial<MemoryContextSlice>;
  rag?: Partial<RAGContextSlice>;
  tool?: Partial<ToolContextSlice>;
  applicationState?: Partial<ApplicationStateSlice>;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Build options
// =============================================================================

export interface ContextBuildOptions {
  /** Hard token ceiling for the assembled context string. Default: 8 000. */
  maxTokens?: number;

  // ---- Slice inclusion toggles -------------------------------------------
  includeWorkspace?: boolean;
  includeEditor?: boolean;
  includeChat?: boolean;
  includeMemory?: boolean;
  includeRAG?: boolean;
  includeTool?: boolean;
  includeApplicationState?: boolean;

  // ---- Fine-grained workspace controls -----------------------------------
  includeFileTree?: boolean;
  includeOpenFiles?: boolean;

  // ---- Fine-grained editor controls --------------------------------------
  includeFileContent?: boolean;
  includeSelection?: boolean;
  includeNearbyCode?: boolean;
  nearbyCodeLines?: number;
  includeDiagnostics?: boolean;

  // ---- Chat controls -----------------------------------------------------
  maxChatMessages?: number;

  // ---- Memory controls ---------------------------------------------------
  maxMemoryEntries?: number;
  memoryCategories?: MemoryCategory[];

  // ---- RAG controls ------------------------------------------------------
  maxRAGDocuments?: number;
  minRAGScore?: number;
}

// =============================================================================
// Validation result
// =============================================================================

export interface ContextValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  tokenWarnings: Partial<Record<ContextSliceName, string>>;
}

// =============================================================================
// Cache entry
// =============================================================================

export interface ContextCacheEntry {
  key: string;
  context: SharedContext;
  createdAt: Date;
  expiresAt: Date;
  tokenCount: number;
  /** Which slices are included. */
  slices: ContextSliceName[];
  hitCount: number;
}

// =============================================================================
// Interfaces
// =============================================================================

export interface IContextValidator {
  validate(context: SharedContext): ContextValidationResult;
  validateSlice(name: ContextSliceName, slice: unknown): string[];
  checkTokenBudget(context: SharedContext): Partial<Record<ContextSliceName, string>>;
}

export interface IContextCache {
  get(key: string): SharedContext | null;
  set(key: string, context: SharedContext, ttlMs?: number): void;
  invalidate(key: string): void;
  invalidateSlice(sliceName: ContextSliceName): void;
  clear(): void;
  size(): number;
  getStats(): { hits: number; misses: number; evictions: number };
}

export interface IContextBuilder {
  build(options?: ContextBuildOptions): Promise<SharedContext>;
  buildSlice<T extends ContextSliceName>(
    sliceName: T,
    options?: ContextBuildOptions,
  ): Promise<SharedContext[T]>;
  estimateTokens(text: string): number;
}

export interface IContextManager {
  /** Get the current live SharedContext. */
  getContext(): SharedContext;

  /**
   * Apply a partial update to the live context.
   * Triggers re-validation and notifies subscribers.
   */
  update(update: SharedContextUpdate): Promise<void>;

  /**
   * Force a full rebuild of the context from all sources.
   */
  rebuild(options?: ContextBuildOptions): Promise<SharedContext>;

  /** Subscribe to context changes. Returns an unsubscribe function. */
  subscribe(handler: (context: SharedContext) => void): () => void;

  /** Prepare and return the AgentContext-compatible view for an agent. */
  getAgentContext(agentId?: string): import('./agents').AgentContext;

  dispose(): void;
}
