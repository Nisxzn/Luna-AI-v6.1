import { workspaceContextService, type WorkspaceContext } from './workspaceContext';
import { editorContextService, type EditorContext } from './editorContext';

export interface ContextSection {
  name: string;
  content: string;
  priority: number;
  tokens: number;
}

export interface ContextBuildOptions {
  maxTokens?: number;
  includeWorkspace?: boolean;
  includeEditor?: boolean;
  includeFileTree?: boolean;
  includeOpenFiles?: boolean;
  includeSelectedText?: boolean;
  includeNearbyCode?: boolean;
  nearbyCodeLines?: number;
}

export class ContextBuilder {
  private cache: Map<string, { context: string; timestamp: number }> = new Map();
  private cacheTimeout: number = 5000; // 5 seconds

  /**
   * Estimate token count for a string (rough approximation)
   * Uses ~4 characters per token as a heuristic
   */
  estimateTokens(text: string): number {
    if (!text) return 0;
    // Rough approximation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Build context for AI request
   */
  buildContext(options: ContextBuildOptions = {}): string {
    const {
      maxTokens = 8000,
      includeWorkspace = true,
      includeEditor = true,
      includeFileTree = true,
      includeOpenFiles = true,
      includeSelectedText = true,
      includeNearbyCode = true,
      nearbyCodeLines = 10,
    } = options;

    const sections: ContextSection[] = [];
    const workspaceContext = workspaceContextService.getContext();
    const editorContext = editorContextService.getContext();

    // Build workspace context section
    if (includeWorkspace && workspaceContext.workspacePath) {
      const workspaceSection = this.buildWorkspaceSection(workspaceContext, {
        includeFileTree,
        includeOpenFiles,
      });
      if (workspaceSection) {
        sections.push(workspaceSection);
      }
    }

    // Build editor context section
    if (includeEditor && editorContext.filePath) {
      const editorSection = this.buildEditorSection(editorContext, {
        includeSelectedText,
        includeNearbyCode,
        nearbyCodeLines,
      });
      if (editorSection) {
        sections.push(editorSection);
      }
    }

    // Sort by priority and truncate to fit within token limit
    const prioritizedSections = this.prioritizeAndTruncate(sections, maxTokens);

    // Combine sections into final context
    return this.combineSections(prioritizedSections);
  }

  /**
   * Build workspace context section
   */
  private buildWorkspaceSection(
    workspace: WorkspaceContext,
    options: { includeFileTree: boolean; includeOpenFiles: boolean }
  ): ContextSection | null {
    const parts: string[] = [];

    parts.push(`## Workspace Context`);
    parts.push(`Workspace: ${workspace.workspacePath}`);
    parts.push(`Name: ${workspace.workspaceMetadata.name}`);
    parts.push(`Total Files: ${workspace.workspaceMetadata.totalFiles}`);
    parts.push(`Languages: ${workspace.workspaceMetadata.languages.join(', ')}`);

    if (options.includeOpenFiles && workspace.openFiles.length > 0) {
      parts.push(`\n### Open Files`);
      workspace.openFiles.forEach((file, index) => {
        const isActive = file === workspace.activeFile ? ' (active)' : '';
        parts.push(`${index + 1}. ${file}${isActive}`);
      });
    }

    if (options.includeFileTree && workspace.fileTree.length > 0) {
      parts.push(`\n### File Tree Structure`);
      const treeString = this.buildFileTreeString(workspace.fileTree, 0);
      parts.push(treeString);
    }

    const content = parts.join('\n');
    return {
      name: 'workspace',
      content,
      priority: 1,
      tokens: this.estimateTokens(content),
    };
  }

  /**
   * Build file tree string
   */
  private buildFileTreeString(items: any[], depth: number): string {
    const lines: string[] = [];
    const indent = '  '.repeat(depth);

    for (const item of items) {
      const icon = item.type === 'directory' ? '📁' : '📄';
      lines.push(`${indent}${icon} ${item.name}`);
      
      if (item.type === 'directory' && item.children) {
        lines.push(this.buildFileTreeString(item.children, depth + 1));
      }
    }

    return lines.join('\n');
  }

  /**
   * Build editor context section
   */
  private buildEditorSection(
    editor: EditorContext,
    options: {
      includeSelectedText: boolean;
      includeNearbyCode: boolean;
      nearbyCodeLines: number;
    }
  ): ContextSection | null {
    const parts: string[] = [];

    parts.push(`\n## Editor Context`);
    parts.push(`File: ${editor.filePath}`);
    parts.push(`Language: ${editor.language}`);

    if (options.includeSelectedText && editor.selection && editor.selection.text) {
      parts.push(`\n### Selected Text`);
      parts.push(`\`\`\`${editor.language}`);
      parts.push(editor.selection.text);
      parts.push(`\`\`\``);
    }

    if (options.includeNearbyCode && editor.cursorPosition) {
      const nearbyLines = editorContextService.getLinesAroundCursor(options.nearbyCodeLines);
      if (nearbyLines.length > 0) {
        parts.push(`\n### Code Around Cursor (Line ${editor.cursorPosition.lineNumber})`);
        parts.push(`\`\`\`${editor.language}`);
        nearbyLines.forEach((line, index) => {
          const lineNum = editor.cursorPosition!.lineNumber - options.nearbyCodeLines + index + 1;
          const isCursorLine = lineNum === editor.cursorPosition!.lineNumber;
          const prefix = isCursorLine ? '> ' : '  ';
          parts.push(`${prefix}${lineNum}: ${line}`);
        });
        parts.push(`\`\`\``);
      }
    }

    const content = parts.join('\n');
    return {
      name: 'editor',
      content,
      priority: 2, // Higher priority than workspace
      tokens: this.estimateTokens(content),
    };
  }

  /**
   * Prioritize sections and truncate to fit within token limit
   */
  private prioritizeAndTruncate(sections: ContextSection[], maxTokens: number): ContextSection[] {
    // Sort by priority (higher priority first)
    const sorted = [...sections].sort((a, b) => b.priority - a.priority);

    const result: ContextSection[] = [];
    let usedTokens = 0;

    for (const section of sorted) {
      if (usedTokens + section.tokens <= maxTokens) {
        result.push(section);
        usedTokens += section.tokens;
      } else {
        // Truncate section to fit remaining tokens
        const remainingTokens = maxTokens - usedTokens;
        if (remainingTokens > 100) { // Only include if we have meaningful space
          const truncated = this.truncateSection(section, remainingTokens);
          result.push(truncated);
          usedTokens += truncated.tokens;
        }
        break;
      }
    }

    return result;
  }

  /**
   * Truncate a section to fit within token limit
   */
  private truncateSection(section: ContextSection, maxTokens: number): ContextSection {
    const targetChars = maxTokens * 4; // Convert back to characters
    const content = section.content.slice(0, targetChars);
    
    return {
      ...section,
      content: content + '\n... (truncated)',
      tokens: this.estimateTokens(content),
    };
  }

  /**
   * Combine sections into final context string
   */
  private combineSections(sections: ContextSection[]): string {
    if (sections.length === 0) {
      return '';
    }

    const parts: string[] = [];
    parts.push(`--- Context ---`);
    sections.forEach((section) => {
      parts.push(section.content);
    });
    parts.push(`--- End Context ---`);

    return parts.join('\n');
  }

  /**
   * Build context with caching
   */
  buildContextWithCache(options: ContextBuildOptions = {}, cacheKey?: string): string {
    const key = cacheKey || JSON.stringify(options);
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.context;
    }

    const context = this.buildContext(options);
    this.cache.set(key, { context, timestamp: Date.now() });

    return context;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get current context statistics
   */
  getStatistics(options: ContextBuildOptions = {}): {
    totalTokens: number;
    sectionCount: number;
    sections: Array<{ name: string; tokens: number }>;
  } {
    const context = this.buildContext(options);
    const totalTokens = this.estimateTokens(context);

    const workspaceContext = workspaceContextService.getContext();
    const editorContext = editorContextService.getContext();

    const sections: Array<{ name: string; tokens: number }> = [];

    if (workspaceContext.workspacePath) {
      const workspaceSection = this.buildWorkspaceSection(workspaceContext, {
        includeFileTree: options.includeFileTree ?? true,
        includeOpenFiles: options.includeOpenFiles ?? true,
      });
      if (workspaceSection) {
        sections.push({ name: workspaceSection.name, tokens: workspaceSection.tokens });
      }
    }

    if (editorContext.filePath) {
      const editorSection = this.buildEditorSection(editorContext, {
        includeSelectedText: options.includeSelectedText ?? true,
        includeNearbyCode: options.includeNearbyCode ?? true,
        nearbyCodeLines: options.nearbyCodeLines ?? 10,
      });
      if (editorSection) {
        sections.push({ name: editorSection.name, tokens: editorSection.tokens });
      }
    }

    return {
      totalTokens,
      sectionCount: sections.length,
      sections,
    };
  }
}

export const contextBuilder = new ContextBuilder();
