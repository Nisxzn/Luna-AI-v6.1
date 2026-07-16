import type {
  SharedContext,
  SharedContextUpdate,
  ContextBuildOptions,
  ContextSliceName,
  IContextManager,
  AgentContext,
  WorkspaceContextSlice,
  EditorContextSlice,
  ChatContextSlice,
  MemoryContextSlice,
  RAGContextSlice,
  ToolContextSlice,
  ApplicationStateSlice,
} from '@luna-ai/types';
import { SharedContextBuilder, type BuilderSources } from './SharedContextBuilder';
import { SharedContextCache } from './SharedContextCache';
import { SharedContextValidator } from './SharedContextValidator';

const DEFAULT_BUILD_OPTIONS: ContextBuildOptions = {
  maxTokens: 8_000,
  includeWorkspace: true,
  includeEditor: true,
  includeChat: true,
  includeMemory: true,
  includeRAG: true,
  includeTool: true,
  includeApplicationState: true,
};

const CACHE_KEY_FULL = 'full';
const CACHE_TTL_MS   = 5_000;   // 5 s — matches desktop ContextBuilder convention

/**
 * SharedContextManager — the single source of truth for the live SharedContext.
 *
 * Responsibilities:
 *  - Owns the current context snapshot and rebuilds it on demand
 *  - Accepts partial slice updates and merges them into the live snapshot
 *  - Notifies subscribers whenever the context changes
 *  - Provides getAgentContext() so any agent can get a properly populated
 *    AgentContext from the shared state
 *  - Delegates building to SharedContextBuilder, caching to SharedContextCache,
 *    and validation to SharedContextValidator
 *
 * NOT responsible for:
 *  - Tool execution
 *  - Autonomous decisions
 *  - Multi-agent coordination
 */
export class SharedContextManager implements IContextManager {

  private currentContext: SharedContext | null;
  private readonly builder: SharedContextBuilder;
  private readonly cache: SharedContextCache;
  private readonly validator: SharedContextValidator;
  private readonly subscribers: Set<(ctx: SharedContext) => void>;
  private buildOptions: ContextBuildOptions;
  private disposed: boolean;

  constructor(
    sources: BuilderSources = {},
    buildOptions: ContextBuildOptions = DEFAULT_BUILD_OPTIONS,
  ) {
    this.builder       = new SharedContextBuilder(sources);
    this.cache         = new SharedContextCache(CACHE_TTL_MS);
    this.validator     = new SharedContextValidator();
    this.subscribers   = new Set();
    this.buildOptions  = { ...DEFAULT_BUILD_OPTIONS, ...buildOptions };
    this.currentContext = null;
    this.disposed      = false;
  }

  // ---------------------------------------------------------------------------
  // IContextManager
  // ---------------------------------------------------------------------------

  /** Returns the live context, building it synchronously from cache if cold. */
  getContext(): SharedContext {
    if (this.currentContext) return this.currentContext;

    // Try cache before doing a full async build
    const cached = this.cache.get(CACHE_KEY_FULL);
    if (cached) {
      this.currentContext = cached;
      return cached;
    }

    // Return an empty shell — callers should await rebuild() first
    return this.buildEmptyContext();
  }

  /**
   * Apply a partial update to one or more slices.
   * Merges the incoming fields, re-validates, updates the cache, and
   * notifies all subscribers.
   */
  async update(update: SharedContextUpdate): Promise<void> {
    this.assertNotDisposed();

    const base = this.currentContext ?? this.buildEmptyContext();

    // Deep-merge each provided slice
    const next: SharedContext = {
      ...base,
      updatedAt: new Date(),
      workspace:        this.mergeSlice(base.workspace, update.workspace),
      editor:           this.mergeSlice(base.editor,    update.editor),
      chat:             this.mergeSlice(base.chat,      update.chat),
      memory:           this.mergeSlice(base.memory,    update.memory),
      rag:              this.mergeSlice(base.rag,        update.rag),
      tool:             this.mergeSlice(base.tool,       update.tool),
      applicationState: this.mergeSlice(base.applicationState, update.applicationState),
      metadata: { ...base.metadata, ...(update.metadata ?? {}) },
    };

    // Re-assemble the prompt string for the changed slices
    next.assembledContext = await this.reassembleContext(next);
    next.tokenBudget = {
      ...next.tokenBudget,
      usedTokens: this.builder.estimateTokens(next.assembledContext),
      remainingTokens: Math.max(
        0,
        next.tokenBudget.maxTokens - this.builder.estimateTokens(next.assembledContext),
      ),
    };

    // Validate
    const validation = this.validator.validate(next);
    next.isValid = validation.isValid;
    next.validationErrors = validation.errors;

    // Invalidate relevant cache slices
    const changedSlices = Object.keys(update).filter(
      k => k !== 'metadata',
    ) as ContextSliceName[];
    for (const slice of changedSlices) {
      this.cache.invalidateSlice(slice);
    }

    this.currentContext = next;
    this.cache.set(CACHE_KEY_FULL, next, CACHE_TTL_MS);
    this.notify(next);
  }

  /**
   * Force a complete rebuild from all sources.
   * Bypasses the cache and stores the fresh context in it.
   */
  async rebuild(options?: ContextBuildOptions): Promise<SharedContext> {
    this.assertNotDisposed();

    const opts = { ...this.buildOptions, ...options };
    const built = await this.builder.build(opts);

    // Validate
    const validation = this.validator.validate(built);
    built.isValid = validation.isValid;
    built.validationErrors = validation.errors;

    this.cache.invalidate(CACHE_KEY_FULL);
    this.cache.set(CACHE_KEY_FULL, built, CACHE_TTL_MS);
    this.currentContext = built;
    this.notify(built);

    return built;
  }

  /** Subscribe to context changes; returns an unsubscribe function. */
  subscribe(handler: (ctx: SharedContext) => void): () => void {
    this.subscribers.add(handler);
    return () => this.subscribers.delete(handler);
  }

  /**
   * Return a properly populated AgentContext derived from the live
   * SharedContext.  Every agent receives an AgentContext — this method
   * bridges the two shapes.
   */
  getAgentContext(agentId?: string): AgentContext {
    const ctx = this.getContext();

    return {
      workspaceId:   ctx.workspace?.workspaceId,
      projectId:     ctx.workspace?.projectId,
      sessionId:     ctx.chat?.sessionId,
      userId:        ctx.applicationState?.userId,
      activeFile:    ctx.editor?.filePath ?? ctx.workspace?.activeFile ?? undefined,
      userRequest:   ctx.chat?.userRequest,
      configuration: ctx.applicationState?.configuration,
      metadata: {
        contextId:    ctx.id,
        createdAt:    ctx.createdAt.toISOString(),
        agentId:      agentId ?? ctx.applicationState?.activeAgentId ?? undefined,
        assembledContext: ctx.assembledContext,
        tokenBudget:  ctx.tokenBudget,
      },
      // Integration placeholders — real integrations injected by AgentsService
      workspace:  ctx.workspace  ?? undefined,
      memory:     ctx.memory     ?? undefined,
      rag:        ctx.rag        ?? undefined,
      chat:       ctx.chat       ?? undefined,
      toolEngine: ctx.tool       ?? undefined,
    };
  }

  dispose(): void {
    this.disposed = true;
    this.subscribers.clear();
    this.cache.clear();
    this.currentContext = null;
  }

  // ---------------------------------------------------------------------------
  // Source update helpers
  // (Call these when upstream data changes instead of calling update() with
  //  manually constructed partial objects)
  // ---------------------------------------------------------------------------

  updateWorkspace(data: Partial<WorkspaceContextSlice>): Promise<void> {
    // Invalidate editor slice too — active file may have changed
    if (data.activeFile !== undefined) {
      this.cache.invalidateSlice('editor');
    }
    return this.update({ workspace: data });
  }

  updateEditor(data: Partial<EditorContextSlice>): Promise<void> {
    return this.update({ editor: data });
  }

  updateChat(data: Partial<ChatContextSlice>): Promise<void> {
    return this.update({ chat: data });
  }

  updateMemory(data: Partial<MemoryContextSlice>): Promise<void> {
    return this.update({ memory: data });
  }

  updateRAG(data: Partial<RAGContextSlice>): Promise<void> {
    return this.update({ rag: data });
  }

  updateTool(data: Partial<ToolContextSlice>): Promise<void> {
    return this.update({ tool: data });
  }

  updateApplicationState(data: Partial<ApplicationStateSlice>): Promise<void> {
    return this.update({ applicationState: data });
  }

  // ---------------------------------------------------------------------------
  // Introspection
  // ---------------------------------------------------------------------------

  getCacheStats() {
    return this.cache.getStats();
  }

  getValidationResult() {
    if (!this.currentContext) return null;
    return this.validator.validate(this.currentContext);
  }

  isValid(): boolean {
    return this.currentContext?.isValid ?? false;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private notify(ctx: SharedContext): void {
    for (const handler of this.subscribers) {
      try {
        handler(ctx);
      } catch (err) {
        console.error('[SharedContextManager] subscriber threw:', err);
      }
    }
  }

  /** Shallow-merge a slice update into an existing slice. */
  private mergeSlice<T extends object>(
    existing: T | undefined,
    patch: Partial<T> | undefined,
  ): T | undefined {
    if (!patch) return existing;
    if (!existing) return patch as T;
    return { ...existing, ...patch };
  }

  /**
   * Re-run just the prompt assembly step from an already-built context.
   * Avoids hitting memory/RAG adapters for a simple field update.
   */
  private async reassembleContext(ctx: SharedContext): Promise<string> {
    // Build a minimal context with the current slices so the builder can
    // re-format it without re-fetching remote data.
    const opts: ContextBuildOptions = {
      ...this.buildOptions,
      includeMemory: false,   // memory/RAG are pre-populated in the slice
      includeRAG:    false,
    };

    const rebuilt = await this.builder.build({
      ...opts,
      // Signal to builder which slices are available by toggling each
      includeWorkspace:        ctx.workspace        !== undefined,
      includeEditor:           ctx.editor           !== undefined,
      includeChat:             ctx.chat             !== undefined,
      includeTool:             ctx.tool             !== undefined,
      includeApplicationState: ctx.applicationState !== undefined,
    });

    // Blend in the pre-assembled memory/RAG text if they exist
    const parts: string[] = [];
    if (rebuilt.assembledContext) parts.push(rebuilt.assembledContext);
    if (ctx.memory?.assembledText) {
      parts.push(`## Memory Context\n${ctx.memory.assembledText}`);
    }
    if (ctx.rag?.assembledText) {
      parts.push(`## Relevant Documents\n${ctx.rag.assembledText}`);
    }

    return parts.join('\n\n---\n\n');
  }

  private buildEmptyContext(): SharedContext {
    const now = new Date();
    return {
      id:               `ctx-empty-${Date.now()}`,
      createdAt:        now,
      updatedAt:        now,
      tokenBudget: {
        maxTokens:       this.buildOptions.maxTokens ?? 8_000,
        usedTokens:      0,
        remainingTokens: this.buildOptions.maxTokens ?? 8_000,
        sliceAllocation: {
          workspace:        800,
          editor:           2000,
          chat:             1600,
          memory:           1200,
          rag:              1600,
          tool:             400,
          applicationState: 400,
        },
      },
      assembledContext: '',
      isValid:          false,
      validationErrors: ['Context has not been built yet — call rebuild() first.'],
      metadata:         {},
    };
  }

  private assertNotDisposed(): void {
    if (this.disposed) {
      throw new Error('SharedContextManager has been disposed.');
    }
  }
}
