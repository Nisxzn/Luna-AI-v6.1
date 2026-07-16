import type {
  SharedContext,
  ContextBuildOptions,
  ContextSliceName,
  IContextBuilder,
  TokenBudget,
  WorkspaceContextSlice,
  EditorContextSlice,
  ChatContextSlice,
  MemoryContextSlice,
  RAGContextSlice,
  ToolContextSlice,
  ApplicationStateSlice,
  MemoryEntry,
} from '@luna-ai/types';

// ---------------------------------------------------------------------------
// Default token allocations (must sum to ≤ maxTokens)
// Ratios: workspace 10%, editor 25%, chat 20%, memory 15%, RAG 20%, tool 5%,
//         appState 5% — leaving headroom for per-slice growth.
// ---------------------------------------------------------------------------
const DEFAULT_SLICE_RATIOS: Record<ContextSliceName, number> = {
  workspace:        0.10,
  editor:           0.25,
  chat:             0.20,
  memory:           0.15,
  rag:              0.20,
  tool:             0.05,
  applicationState: 0.05,
};

const DEFAULT_MAX_TOKENS = 8_000;

/**
 * SharedContextBuilder — assembles a full SharedContext from raw source data.
 *
 * Usage pattern:
 *  1. Construct with optional source adapters (memory manager, RAG service, …)
 *  2. Call `build(options)` to get a complete SharedContext snapshot
 *  3. Individual slices can be built via `buildSlice(name, options)`
 *
 * Source data is provided via the `Sources` object injected at construction.
 * Any absent source simply produces an empty slice — the builder never throws
 * due to a missing source.
 */
export class SharedContextBuilder implements IContextBuilder {
  private readonly sources: BuilderSources;
  private idCounter: number;

  constructor(sources: BuilderSources = {}) {
    this.sources = sources;
    this.idCounter = 0;
  }

  // ---------------------------------------------------------------------------
  // IContextBuilder
  // ---------------------------------------------------------------------------

  async build(options: ContextBuildOptions = {}): Promise<SharedContext> {
    const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
    const allocation = this.computeAllocation(maxTokens, options);

    // Build each requested slice
    const workspace = options.includeWorkspace !== false
      ? await this.buildWorkspaceSlice(options, allocation.workspace)
      : undefined;

    const editor = options.includeEditor !== false
      ? await this.buildEditorSlice(options, allocation.editor)
      : undefined;

    const chat = options.includeChat !== false
      ? await this.buildChatSlice(options, allocation.chat)
      : undefined;

    const memory = options.includeMemory !== false
      ? await this.buildMemorySlice(options, allocation.memory)
      : undefined;

    const rag = options.includeRAG !== false
      ? await this.buildRAGSlice(options, allocation.rag)
      : undefined;

    const tool = options.includeTool !== false
      ? await this.buildToolSlice(options, allocation.tool)
      : undefined;

    const applicationState = options.includeApplicationState !== false
      ? await this.buildApplicationStateSlice(options)
      : undefined;

    // Assemble the prompt string with token budget enforcement
    const assembledContext = this.assemblePromptString(
      { workspace, editor, chat, memory, rag, tool, applicationState },
      maxTokens,
    );

    const usedTokens = this.estimateTokens(assembledContext);
    const now = new Date();

    const context: SharedContext = {
      id: this.nextId(),
      createdAt: now,
      updatedAt: now,
      workspace,
      editor,
      chat,
      memory,
      rag,
      tool,
      applicationState,
      tokenBudget: {
        maxTokens,
        usedTokens,
        remainingTokens: Math.max(0, maxTokens - usedTokens),
        sliceAllocation: allocation,
      },
      assembledContext,
      isValid: true,        // Validator will update this
      validationErrors: [],
      metadata: {},
    };

    return context;
  }

  async buildSlice<T extends ContextSliceName>(
    sliceName: T,
    options: ContextBuildOptions = {},
  ): Promise<SharedContext[T]> {
    const maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
    const allocation = this.computeAllocation(maxTokens, options);
    const sliceAlloc = allocation[sliceName];

    switch (sliceName) {
      case 'workspace':        return this.buildWorkspaceSlice(options, sliceAlloc) as Promise<SharedContext[T]>;
      case 'editor':           return this.buildEditorSlice(options, sliceAlloc) as Promise<SharedContext[T]>;
      case 'chat':             return this.buildChatSlice(options, sliceAlloc) as Promise<SharedContext[T]>;
      case 'memory':           return this.buildMemorySlice(options, sliceAlloc) as Promise<SharedContext[T]>;
      case 'rag':              return this.buildRAGSlice(options, sliceAlloc) as Promise<SharedContext[T]>;
      case 'tool':             return this.buildToolSlice(options, sliceAlloc) as Promise<SharedContext[T]>;
      case 'applicationState': return this.buildApplicationStateSlice(options) as Promise<SharedContext[T]>;
      default:                 return undefined as SharedContext[T];
    }
  }

  /** ~4 characters per token heuristic — matches the existing codebase convention. */
  estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  // ---------------------------------------------------------------------------
  // Slice builders (private)
  // ---------------------------------------------------------------------------

  private async buildWorkspaceSlice(
    options: ContextBuildOptions,
    _tokenAlloc: number,
  ): Promise<WorkspaceContextSlice | undefined> {
    if (!this.sources.workspace) return undefined;

    const src = this.sources.workspace;
    return {
      workspaceId:  src.workspaceId  ?? '',
      workspacePath: src.workspacePath ?? null,
      projectId:    src.projectId,
      activeFile:   src.activeFile   ?? null,
      openFiles:    src.openFiles    ?? [],
      recentFiles:  src.recentFiles  ?? [],
      fileTree:     options.includeFileTree !== false ? (src.fileTree ?? []) : [],
      metadata:     src.metadata     ?? { name: '', totalFiles: 0, totalDirectories: 0, languages: [] },
    };
  }

  private async buildEditorSlice(
    options: ContextBuildOptions,
    tokenAlloc: number,
  ): Promise<EditorContextSlice | undefined> {
    if (!this.sources.editor) return undefined;

    const src = this.sources.editor;
    let content = options.includeFileContent !== false ? (src.content ?? '') : '';

    // Truncate file content if it would blow the editor allocation
    if (content && this.estimateTokens(content) > tokenAlloc * 0.8) {
      const maxChars = Math.floor(tokenAlloc * 0.8 * 4);
      content = content.slice(0, maxChars) + '\n// [content truncated]';
    }

    return {
      filePath:      src.filePath      ?? null,
      language:      src.language      ?? 'plaintext',
      content,
      selection:     options.includeSelection !== false ? (src.selection ?? null) : null,
      cursorPosition: src.cursorPosition ?? null,
      visibleRange:  src.visibleRange  ?? null,
      currentLine:   src.currentLine   ?? null,
      diagnostics:   options.includeDiagnostics !== false ? (src.diagnostics ?? []) : [],
    };
  }

  private async buildChatSlice(
    options: ContextBuildOptions,
    tokenAlloc: number,
  ): Promise<ChatContextSlice | undefined> {
    if (!this.sources.chat) return undefined;

    const src = this.sources.chat;
    const maxMessages = options.maxChatMessages ?? 20;

    // Take the most recent N messages, then check token budget
    let messages = (src.messages ?? []).slice(-maxMessages);
    messages = this.trimMessagesToTokenBudget(messages, tokenAlloc);

    return {
      sessionId:      src.sessionId      ?? '',
      conversationId: src.conversationId ?? '',
      messages,
      userRequest:    src.userRequest    ?? '',
      systemPrompt:   src.systemPrompt,
    };
  }

  private async buildMemorySlice(
    options: ContextBuildOptions,
    tokenAlloc: number,
  ): Promise<MemoryContextSlice | undefined> {
    if (!this.sources.memoryAdapter) return undefined;

    const agentCtx = this.sources.agentContextHint ?? {};
    const rawText = await this.sources.memoryAdapter.getContext(agentCtx as any);
    if (!rawText) return undefined;

    // Convert raw text to entries (best-effort parse)
    const entries: MemoryEntry[] = this.parseMemoryText(rawText, options.maxMemoryEntries ?? 20);

    // Truncate assembled text to budget
    let assembledText = rawText;
    let truncated = false;
    if (this.estimateTokens(assembledText) > tokenAlloc) {
      const maxChars = tokenAlloc * 4;
      assembledText = assembledText.slice(0, maxChars) + '\n[memory truncated]';
      truncated = true;
    }

    return {
      entries,
      assembledText,
      tokenCount: this.estimateTokens(assembledText),
      truncated,
      retrievedAt: new Date(),
    };
  }

  private async buildRAGSlice(
    options: ContextBuildOptions,
    tokenAlloc: number,
  ): Promise<RAGContextSlice | undefined> {
    if (!this.sources.ragContext) return undefined;

    const src = this.sources.ragContext;
    const maxDocs  = options.maxRAGDocuments ?? 10;
    const minScore = options.minRAGScore     ?? 0;

    let results = (src.retrievedDocuments ?? [])
      .filter(r => r.score >= minScore)
      .slice(0, maxDocs);

    let assembledText = src.assembledContext ?? '';
    let truncated = false;
    if (this.estimateTokens(assembledText) > tokenAlloc) {
      const maxChars = tokenAlloc * 4;
      assembledText = assembledText.slice(0, maxChars) + '\n[RAG context truncated]';
      truncated = true;
      results = results.slice(0, Math.ceil(results.length / 2));
    }

    return {
      query:        src.query   ?? '',
      results,
      assembledText,
      tokenCount:   this.estimateTokens(assembledText),
      truncated,
      retrievedAt:  new Date(),
      metadata: {
        totalDocuments: results.length,
        averageScore:
          results.length > 0
            ? results.reduce((s, r) => s + r.score, 0) / results.length
            : 0,
        retrievalTimeMs: src.metadata?.retrievalTime ?? 0,
      },
    };
  }

  private async buildToolSlice(
    _options: ContextBuildOptions,
    _tokenAlloc: number,
  ): Promise<ToolContextSlice | undefined> {
    if (!this.sources.toolAdapter) return undefined;

    const agentId = this.sources.agentContextHint?.agentId ?? 'unknown';
    const toolNames = await this.sources.toolAdapter.getAvailableTools(agentId);

    const availableTools = toolNames.map(name => ({
      name,
      description: '',        // populated by a real tool registry
      parameters:  {},
      requiresPermission: true,
      permitted: true,
    }));

    return {
      availableTools,
      executionHistory: [],
    };
  }

  private async buildApplicationStateSlice(
    _options: ContextBuildOptions,
  ): Promise<ApplicationStateSlice | undefined> {
    const src = this.sources.applicationState;
    if (!src) return undefined;

    return {
      activeAgentId:     src.activeAgentId     ?? null,
      activeTaskId:      src.activeTaskId      ?? null,
      model:             src.model             ?? 'gpt-4o-mini',
      provider:          src.provider          ?? 'openai',
      temperature:       src.temperature,
      maxResponseTokens: src.maxResponseTokens,
      userId:            src.userId,
      configuration:     src.configuration     ?? {},
    };
  }

  // ---------------------------------------------------------------------------
  // Prompt assembly
  // ---------------------------------------------------------------------------

  private assemblePromptString(
    slices: Partial<Record<ContextSliceName, unknown>>,
    maxTokens: number,
  ): string {
    const parts: Array<{ name: ContextSliceName; text: string; priority: number }> = [];

    const ws = slices.workspace as WorkspaceContextSlice | undefined;
    if (ws) {
      parts.push({ name: 'workspace', priority: 1, text: this.formatWorkspace(ws) });
    }

    const ed = slices.editor as EditorContextSlice | undefined;
    if (ed) {
      parts.push({ name: 'editor', priority: 2, text: this.formatEditor(ed) });
    }

    const ch = slices.chat as ChatContextSlice | undefined;
    if (ch) {
      parts.push({ name: 'chat', priority: 3, text: this.formatChat(ch) });
    }

    const mem = slices.memory as MemoryContextSlice | undefined;
    if (mem && mem.assembledText) {
      parts.push({ name: 'memory', priority: 4, text: `## Memory Context\n${mem.assembledText}` });
    }

    const rag = slices.rag as RAGContextSlice | undefined;
    if (rag && rag.assembledText) {
      parts.push({ name: 'rag', priority: 5, text: `## Relevant Documents\n${rag.assembledText}` });
    }

    const tl = slices.tool as ToolContextSlice | undefined;
    if (tl && tl.availableTools.length > 0) {
      parts.push({ name: 'tool', priority: 6, text: this.formatTools(tl) });
    }

    // Sort by priority, then greedily fill the token budget
    parts.sort((a, b) => a.priority - b.priority);

    const selected: string[] = [];
    let used = 0;
    for (const part of parts) {
      const tokens = this.estimateTokens(part.text);
      if (used + tokens <= maxTokens) {
        selected.push(part.text);
        used += tokens;
      }
    }

    return selected.join('\n\n---\n\n');
  }

  // ---------------------------------------------------------------------------
  // Formatters
  // ---------------------------------------------------------------------------

  private formatWorkspace(ws: WorkspaceContextSlice): string {
    const lines = [
      '## Workspace Context',
      `Workspace: ${ws.workspacePath ?? '(none)'}`,
      `Name: ${ws.metadata.name || '(unnamed)'}`,
      `Languages: ${ws.metadata.languages.join(', ') || '(none)'}`,
      `Total Files: ${ws.metadata.totalFiles}`,
    ];
    if (ws.activeFile) {
      lines.push(`Active File: ${ws.activeFile}`);
    }
    if (ws.openFiles.length > 0) {
      lines.push('', '### Open Files');
      ws.openFiles.forEach((f, i) => {
        lines.push(`${i + 1}. ${f}${f === ws.activeFile ? ' (active)' : ''}`);
      });
    }
    return lines.join('\n');
  }

  private formatEditor(ed: EditorContextSlice): string {
    const lines = [
      '## Editor Context',
      `File: ${ed.filePath ?? '(none)'}`,
      `Language: ${ed.language}`,
    ];
    if (ed.selection?.text) {
      lines.push('', '### Selected Text', `\`\`\`${ed.language}`, ed.selection.text, '```');
    }
    if (ed.content) {
      lines.push('', '### File Content', `\`\`\`${ed.language}`, ed.content, '```');
    }
    if (ed.diagnostics.length > 0) {
      lines.push('', '### Diagnostics');
      ed.diagnostics.forEach(d => {
        lines.push(`- [${d.severity.toUpperCase()}] Line ${d.startLine}: ${d.message}`);
      });
    }
    return lines.join('\n');
  }

  private formatChat(ch: ChatContextSlice): string {
    const lines = ['## Chat Context', `User Request: ${ch.userRequest}`];
    if (ch.messages.length > 0) {
      lines.push('', '### Recent Conversation');
      ch.messages.forEach(m => {
        lines.push(`**${m.role}**: ${m.content}`);
      });
    }
    return lines.join('\n');
  }

  private formatTools(tl: ToolContextSlice): string {
    const lines = ['## Available Tools'];
    tl.availableTools.forEach(t => {
      const status = t.permitted ? '✓' : '✗';
      lines.push(`${status} ${t.name}${t.description ? ': ' + t.description : ''}`);
    });
    return lines.join('\n');
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private computeAllocation(
    maxTokens: number,
    _options: ContextBuildOptions,
  ): Record<ContextSliceName, number> {
    const alloc = {} as Record<ContextSliceName, number>;
    for (const [name, ratio] of Object.entries(DEFAULT_SLICE_RATIOS)) {
      alloc[name as ContextSliceName] = Math.floor(maxTokens * ratio);
    }
    return alloc;
  }

  private trimMessagesToTokenBudget(
    messages: Array<{ role: string; content: string }>,
    tokenAlloc: number,
  ): any[] {
    let used = 0;
    const result: any[] = [];
    // Walk newest → oldest; keep until budget exhausted
    for (let i = messages.length - 1; i >= 0; i--) {
      const tokens = this.estimateTokens(messages[i].content);
      if (used + tokens > tokenAlloc) break;
      result.unshift(messages[i]);
      used += tokens;
    }
    return result;
  }

  private parseMemoryText(raw: string, maxEntries: number): MemoryEntry[] {
    // Memory text format from AgentMemoryAdapter: "[category] title: content"
    const lines = raw.split('\n\n').slice(0, maxEntries);
    return lines.map((line, i) => {
      const match = line.match(/^\[(\w+)\]\s*([^:]+):\s*(.+)$/s);
      return {
        id:             `mem-${i}`,
        title:          match?.[2]?.trim() ?? `Memory ${i + 1}`,
        content:        match?.[3]?.trim() ?? line.trim(),
        category:       (match?.[1] ?? 'conversation') as any,
        importance:     'medium' as const,
        tags:           [],
        relevanceScore: undefined,
      };
    });
  }

  private nextId(): string {
    return `ctx-${Date.now()}-${++this.idCounter}`;
  }
}

// ---------------------------------------------------------------------------
// Source data types injected at construction time
// ---------------------------------------------------------------------------

export interface BuilderSources {
  /** Raw workspace data — provided by the desktop WorkspaceContextService. */
  workspace?: {
    workspaceId?: string;
    workspacePath?: string | null;
    projectId?: string;
    activeFile?: string | null;
    openFiles?: string[];
    recentFiles?: string[];
    fileTree?: import('@luna-ai/types').WorkspaceFileItem[];
    metadata?: { name: string; totalFiles: number; totalDirectories: number; languages: string[] };
  };

  /** Raw editor data — provided by EditorContextService. */
  editor?: {
    filePath?: string | null;
    language?: string;
    content?: string;
    selection?: { text: string; startLine: number; startColumn: number; endLine: number; endColumn: number } | null;
    cursorPosition?: { line: number; column: number } | null;
    visibleRange?: { startLine: number; endLine: number } | null;
    currentLine?: string | null;
    diagnostics?: import('@luna-ai/types').EditorDiagnostic[];
  };

  /** Raw chat data — provided by the chat session. */
  chat?: {
    sessionId?: string;
    conversationId?: string;
    messages?: import('@luna-ai/types').ChatMessage[];
    userRequest?: string;
    systemPrompt?: string;
  };

  /** Memory adapter — delegates to MemoryManager.getContext(). */
  memoryAdapter?: {
    getContext(context: import('@luna-ai/types').AgentContext): Promise<string>;
  };

  /** Pre-assembled RAGContext from the RAG service. */
  ragContext?: import('@luna-ai/types').RAGContext;

  /** Tool adapter — delegates to AgentToolAdapter.getAvailableTools(). */
  toolAdapter?: {
    getAvailableTools(agentId: string): Promise<string[]>;
  };

  /** Application state values provided by the caller. */
  applicationState?: Partial<import('@luna-ai/types').ApplicationStateSlice>;

  /** Hint to pass to memory/tool adapters when they need an AgentContext. */
  agentContextHint?: Partial<import('@luna-ai/types').AgentContext> & { agentId?: string };
}
