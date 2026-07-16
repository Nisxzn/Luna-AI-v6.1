import type {
  SharedContext,
  ContextSliceName,
  ContextValidationResult,
  IContextValidator,
  WorkspaceContextSlice,
  EditorContextSlice,
  ChatContextSlice,
  MemoryContextSlice,
  RAGContextSlice,
  ToolContextSlice,
  ApplicationStateSlice,
} from '@luna-ai/types';

/**
 * SharedContextValidator — validates a SharedContext snapshot.
 *
 * Responsibilities:
 *  - Check each slice for required / sensible field values
 *  - Produce per-slice token-budget warnings
 *  - Return a ContextValidationResult (errors are hard failures;
 *    warnings are advisory)
 *
 * This class is intentionally side-effect-free: it never mutates the
 * context it receives.
 */
export class SharedContextValidator implements IContextValidator {

  // ---------------------------------------------------------------------------
  // Top-level entry point
  // ---------------------------------------------------------------------------

  validate(context: SharedContext): ContextValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Base fields
    if (!context.id || context.id.trim() === '') {
      errors.push('SharedContext is missing a valid id.');
    }
    if (!(context.createdAt instanceof Date) || isNaN(context.createdAt.getTime())) {
      errors.push('SharedContext.createdAt is not a valid Date.');
    }
    if (!(context.updatedAt instanceof Date) || isNaN(context.updatedAt.getTime())) {
      errors.push('SharedContext.updatedAt is not a valid Date.');
    }

    // At least one slice should be present
    const presentSlices = this.listPresentSlices(context);
    if (presentSlices.length === 0) {
      warnings.push('SharedContext has no populated slices — nothing will be injected into the prompt.');
    }

    // Validate each present slice
    if (context.workspace) {
      errors.push(...this.validateWorkspace(context.workspace));
    }
    if (context.editor) {
      errors.push(...this.validateEditor(context.editor));
    }
    if (context.chat) {
      errors.push(...this.validateChat(context.chat));
    }
    if (context.memory) {
      errors.push(...this.validateMemory(context.memory));
    }
    if (context.rag) {
      errors.push(...this.validateRAG(context.rag));
    }
    if (context.tool) {
      errors.push(...this.validateTool(context.tool));
    }
    if (context.applicationState) {
      errors.push(...this.validateApplicationState(context.applicationState));
    }

    // Token budget
    const tokenWarnings = this.checkTokenBudget(context);
    for (const [, warn] of Object.entries(tokenWarnings)) {
      if (warn) warnings.push(warn);
    }

    // assembledContext sanity
    if (typeof context.assembledContext !== 'string') {
      errors.push('SharedContext.assembledContext must be a string.');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      tokenWarnings,
    };
  }

  // ---------------------------------------------------------------------------
  // Per-slice validation
  // ---------------------------------------------------------------------------

  validateSlice(name: ContextSliceName, slice: unknown): string[] {
    if (slice === null || slice === undefined) {
      return [];           // absent slice is allowed
    }
    switch (name) {
      case 'workspace':        return this.validateWorkspace(slice as WorkspaceContextSlice);
      case 'editor':           return this.validateEditor(slice as EditorContextSlice);
      case 'chat':             return this.validateChat(slice as ChatContextSlice);
      case 'memory':           return this.validateMemory(slice as MemoryContextSlice);
      case 'rag':              return this.validateRAG(slice as RAGContextSlice);
      case 'tool':             return this.validateTool(slice as ToolContextSlice);
      case 'applicationState': return this.validateApplicationState(slice as ApplicationStateSlice);
    }
  }

  // ---------------------------------------------------------------------------
  // Token budget analysis
  // ---------------------------------------------------------------------------

  checkTokenBudget(
    context: SharedContext,
  ): Partial<Record<ContextSliceName, string>> {
    const warnings: Partial<Record<ContextSliceName, string>> = {};
    const { tokenBudget } = context;

    if (!tokenBudget) return warnings;

    const { maxTokens, sliceAllocation } = tokenBudget;

    // Warn if a slice consumes > 80 % of its allocation
    const check = (
      name: ContextSliceName,
      actualTokens: number | undefined,
    ) => {
      if (actualTokens === undefined) return;
      const alloc = sliceAllocation?.[name];
      if (alloc && actualTokens > alloc * 0.8) {
        warnings[name] =
          `Slice "${name}" uses ${actualTokens} tokens (allocation: ${alloc}).`;
      }
    };

    check('memory', context.memory?.tokenCount);
    check('rag', context.rag?.tokenCount);

    // Warn if total used > 90 % of max
    if (tokenBudget.usedTokens > maxTokens * 0.9) {
      warnings['applicationState'] =
        `Total context (${tokenBudget.usedTokens} tokens) is near the ` +
        `${maxTokens}-token limit.`;
    }

    return warnings;
  }

  // ---------------------------------------------------------------------------
  // Slice validators (private)
  // ---------------------------------------------------------------------------

  private validateWorkspace(slice: WorkspaceContextSlice): string[] {
    const errs: string[] = [];
    if (!slice.workspaceId || slice.workspaceId.trim() === '') {
      errs.push('workspace.workspaceId is required.');
    }
    if (!Array.isArray(slice.openFiles)) {
      errs.push('workspace.openFiles must be an array.');
    }
    if (!Array.isArray(slice.fileTree)) {
      errs.push('workspace.fileTree must be an array.');
    }
    if (!slice.metadata || typeof slice.metadata !== 'object') {
      errs.push('workspace.metadata is required.');
    }
    return errs;
  }

  private validateEditor(slice: EditorContextSlice): string[] {
    const errs: string[] = [];
    if (typeof slice.language !== 'string') {
      errs.push('editor.language must be a string.');
    }
    if (typeof slice.content !== 'string') {
      errs.push('editor.content must be a string.');
    }
    if (!Array.isArray(slice.diagnostics)) {
      errs.push('editor.diagnostics must be an array.');
    }
    return errs;
  }

  private validateChat(slice: ChatContextSlice): string[] {
    const errs: string[] = [];
    if (!slice.sessionId || slice.sessionId.trim() === '') {
      errs.push('chat.sessionId is required.');
    }
    if (!slice.conversationId || slice.conversationId.trim() === '') {
      errs.push('chat.conversationId is required.');
    }
    if (typeof slice.userRequest !== 'string') {
      errs.push('chat.userRequest must be a string.');
    }
    if (!Array.isArray(slice.messages)) {
      errs.push('chat.messages must be an array.');
    } else {
      for (const [i, msg] of slice.messages.entries()) {
        if (!['user', 'assistant', 'system'].includes(msg.role)) {
          errs.push(`chat.messages[${i}].role is invalid: "${msg.role}".`);
        }
        if (typeof msg.content !== 'string') {
          errs.push(`chat.messages[${i}].content must be a string.`);
        }
      }
    }
    return errs;
  }

  private validateMemory(slice: MemoryContextSlice): string[] {
    const errs: string[] = [];
    if (!Array.isArray(slice.entries)) {
      errs.push('memory.entries must be an array.');
    }
    if (typeof slice.assembledText !== 'string') {
      errs.push('memory.assembledText must be a string.');
    }
    if (typeof slice.tokenCount !== 'number' || slice.tokenCount < 0) {
      errs.push('memory.tokenCount must be a non-negative number.');
    }
    return errs;
  }

  private validateRAG(slice: RAGContextSlice): string[] {
    const errs: string[] = [];
    if (!slice.query || slice.query.trim() === '') {
      errs.push('rag.query is required.');
    }
    if (!Array.isArray(slice.results)) {
      errs.push('rag.results must be an array.');
    }
    if (typeof slice.assembledText !== 'string') {
      errs.push('rag.assembledText must be a string.');
    }
    if (typeof slice.tokenCount !== 'number' || slice.tokenCount < 0) {
      errs.push('rag.tokenCount must be a non-negative number.');
    }
    return errs;
  }

  private validateTool(slice: ToolContextSlice): string[] {
    const errs: string[] = [];
    if (!Array.isArray(slice.availableTools)) {
      errs.push('tool.availableTools must be an array.');
    }
    if (!Array.isArray(slice.executionHistory)) {
      errs.push('tool.executionHistory must be an array.');
    }
    return errs;
  }

  private validateApplicationState(slice: ApplicationStateSlice): string[] {
    const errs: string[] = [];
    if (!slice.model || slice.model.trim() === '') {
      errs.push('applicationState.model is required.');
    }
    if (!slice.provider || slice.provider.trim() === '') {
      errs.push('applicationState.provider is required.');
    }
    if (typeof slice.configuration !== 'object' || slice.configuration === null) {
      errs.push('applicationState.configuration must be an object.');
    }
    return errs;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private listPresentSlices(context: SharedContext): ContextSliceName[] {
    const names: ContextSliceName[] = [
      'workspace', 'editor', 'chat', 'memory', 'rag', 'tool', 'applicationState',
    ];
    return names.filter(n => context[n] !== undefined && context[n] !== null);
  }
}
