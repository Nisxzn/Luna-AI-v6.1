import type { editor } from 'monaco-editor';

export interface EditorContext {
  filePath: string | null;
  language: string;
  content: string;
  selection: {
    text: string;
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  } | null;
  cursorPosition: {
    lineNumber: number;
    column: number;
  } | null;
  visibleRange: {
    startLineNumber: number;
    endLineNumber: number;
  } | null;
  currentLine: string | null;
  diagnostics: Array<{
    message: string;
    severity: 'error' | 'warning' | 'info' | 'hint';
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  }>;
}

export class EditorContextService {
  private context: EditorContext;
  private listeners: Set<(context: EditorContext) => void> = new Set();
  private editorInstance: editor.IStandaloneCodeEditor | null = null;

  constructor() {
    this.context = this.getInitialContext();
  }

  private getInitialContext(): EditorContext {
    return {
      filePath: null,
      language: 'plaintext',
      content: '',
      selection: null,
      cursorPosition: null,
      visibleRange: null,
      currentLine: null,
      diagnostics: [],
    };
  }

  getContext(): EditorContext {
    return { ...this.context };
  }

  subscribe(listener: (context: EditorContext) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.getContext()));
  }

  setEditorInstance(editor: editor.IStandaloneCodeEditor | null) {
    this.editorInstance = editor;
    
    if (editor) {
      // Subscribe to editor events
      editor.onDidChangeCursorSelection((e) => {
        this.handleSelectionChange(e);
      });
      
      editor.onDidChangeModelContent((e) => {
        this.handleContentChange();
      });
      
      editor.onDidChangeModel((e) => {
        this.handleModelChange();
      });
      
      editor.onDidScrollChange((e) => {
        this.handleScrollChange();
      });
    }
  }

  private handleSelectionChange(e: editor.ICursorSelectionChangedEvent) {
    const selection = e.selection;
    const model = this.editorInstance?.getModel();
    
    if (model && selection) {
      const selectedText = model.getValueInRange(selection);
      this.context.selection = {
        text: selectedText,
        startLineNumber: selection.startLineNumber,
        startColumn: selection.startColumn,
        endLineNumber: selection.endLineNumber,
        endColumn: selection.endColumn,
      };
      
      this.context.cursorPosition = {
        lineNumber: selection.positionLineNumber,
        column: selection.positionColumn,
      };
      
      this.updateCurrentLine();
      this.notify();
    }
  }

  private handleContentChange() {
    const model = this.editorInstance?.getModel();
    if (model) {
      this.context.content = model.getValue();
      this.updateCurrentLine();
      this.notify();
    }
  }

  private handleModelChange() {
    const model = this.editorInstance?.getModel();
    if (model) {
      this.context.content = model.getValue();
      this.context.language = model.getLanguageId();
      this.updateCurrentLine();
      this.notify();
    }
  }

  private handleScrollChange() {
    if (this.editorInstance) {
      const visibleRanges = this.editorInstance.getVisibleRanges();
      if (visibleRanges.length > 0) {
        const range = visibleRanges[0];
        this.context.visibleRange = {
          startLineNumber: range.startLineNumber,
          endLineNumber: range.endLineNumber,
        };
        this.notify();
      }
    }
  }

  private updateCurrentLine() {
    if (this.editorInstance && this.context.cursorPosition) {
      const model = this.editorInstance.getModel();
      if (model) {
        const lineContent = model.getLineContent(this.context.cursorPosition.lineNumber);
        this.context.currentLine = lineContent;
      }
    }
  }

  updateFilePath(filePath: string | null) {
    this.context.filePath = filePath;
    this.notify();
  }

  updateLanguage(language: string) {
    this.context.language = language;
    this.notify();
  }

  updateContent(content: string) {
    this.context.content = content;
    this.updateCurrentLine();
    this.notify();
  }

  updateDiagnostics(diagnostics: EditorContext['diagnostics']) {
    this.context.diagnostics = diagnostics;
    this.notify();
  }

  getSelectedText(): string {
    return this.context.selection?.text || '';
  }

  getCurrentLine(): string {
    return this.context.currentLine || '';
  }

  getLinesAroundCursor(lineCount: number = 10): string[] {
    if (!this.editorInstance || !this.context.cursorPosition) {
      return [];
    }

    const model = this.editorInstance.getModel();
    if (!model) {
      return [];
    }

    const currentLine = this.context.cursorPosition.lineNumber;
    const startLine = Math.max(1, currentLine - lineCount);
    const endLine = Math.min(model.getLineCount(), currentLine + lineCount);

    const lines: string[] = [];
    for (let i = startLine; i <= endLine; i++) {
      lines.push(model.getLineContent(i));
    }

    return lines;
  }

  reset() {
    this.context = this.getInitialContext();
    this.notify();
  }
}

export const editorContextService = new EditorContextService();
