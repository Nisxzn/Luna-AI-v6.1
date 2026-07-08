import { FileSystemItem } from '../hooks/useWorkspace';

export interface WorkspaceContext {
  workspacePath: string | null;
  fileTree: FileSystemItem[];
  openFiles: string[];
  activeFile: string | null;
  recentlyOpenedFiles: string[];
  workspaceMetadata: {
    name: string;
    totalFiles: number;
    totalDirectories: number;
    languages: string[];
  };
}

export class WorkspaceContextService {
  private context: WorkspaceContext;
  private listeners: Set<(context: WorkspaceContext) => void> = new Set();

  constructor() {
    this.context = this.getInitialContext();
  }

  private getInitialContext(): WorkspaceContext {
    return {
      workspacePath: null,
      fileTree: [],
      openFiles: [],
      activeFile: null,
      recentlyOpenedFiles: [],
      workspaceMetadata: {
        name: '',
        totalFiles: 0,
        totalDirectories: 0,
        languages: [],
      },
    };
  }

  getContext(): WorkspaceContext {
    return { ...this.context };
  }

  subscribe(listener: (context: WorkspaceContext) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((listener) => listener(this.getContext()));
  }

  updateWorkspacePath(path: string | null) {
    this.context.workspacePath = path;
    if (path) {
      this.context.workspaceMetadata.name = path.split(/[/\\]/).pop() || '';
    } else {
      this.context.workspaceMetadata.name = '';
    }
    this.notify();
  }

  updateFileTree(tree: FileSystemItem[]) {
    this.context.fileTree = tree;
    this.updateWorkspaceMetadata(tree);
    this.notify();
  }

  updateOpenFiles(files: string[]) {
    this.context.openFiles = files;
    this.notify();
  }

  updateActiveFile(filePath: string | null) {
    this.context.activeFile = filePath;
    if (filePath && !this.context.recentlyOpenedFiles.includes(filePath)) {
      this.context.recentlyOpenedFiles = [filePath, ...this.context.recentlyOpenedFiles].slice(0, 20);
    }
    this.notify();
  }

  addRecentlyOpenedFile(filePath: string) {
    if (!this.context.recentlyOpenedFiles.includes(filePath)) {
      this.context.recentlyOpenedFiles = [filePath, ...this.context.recentlyOpenedFiles].slice(0, 20);
      this.notify();
    }
  }

  private updateWorkspaceMetadata(tree: FileSystemItem[]) {
    let totalFiles = 0;
    let totalDirectories = 0;
    const languages = new Set<string>();

    const traverse = (items: FileSystemItem[]) => {
      for (const item of items) {
        if (item.type === 'file') {
          totalFiles++;
          const ext = item.path.split('.').pop()?.toLowerCase();
          if (ext) {
            const language = this.getLanguageFromExtension(ext);
            if (language) languages.add(language);
          }
        } else if (item.type === 'directory') {
          totalDirectories++;
          if (item.children) {
            traverse(item.children);
          }
        }
      }
    };

    traverse(tree);

    this.context.workspaceMetadata = {
      name: this.context.workspaceMetadata.name,
      totalFiles,
      totalDirectories,
      languages: Array.from(languages),
    };
  }

  private getLanguageFromExtension(ext: string): string | null {
    const languageMap: Record<string, string> = {
      js: 'JavaScript',
      jsx: 'JavaScript',
      ts: 'TypeScript',
      tsx: 'TypeScript',
      py: 'Python',
      rb: 'Ruby',
      go: 'Go',
      rs: 'Rust',
      java: 'Java',
      cpp: 'C++',
      c: 'C',
      cs: 'C#',
      php: 'PHP',
      swift: 'Swift',
      kt: 'Kotlin',
      scala: 'Scala',
      html: 'HTML',
      css: 'CSS',
      scss: 'SCSS',
      json: 'JSON',
      xml: 'XML',
      yaml: 'YAML',
      yml: 'YAML',
      md: 'Markdown',
      sql: 'SQL',
      sh: 'Shell',
      bash: 'Bash',
      zsh: 'Zsh',
      ps1: 'PowerShell',
    };

    return languageMap[ext] || null;
  }

  reset() {
    this.context = this.getInitialContext();
    this.notify();
  }
}

export const workspaceContextService = new WorkspaceContextService();
