export interface FileSystemItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileSystemItem[];
}

export interface SaveResult {
  success: boolean;
  error?: string;
}

export interface WorkspaceState {
  workspacePath: string | null;
  lastOpenedFiles: string[];
  activeFile: string | null;
}

export interface FileChange {
  filePath: string;
  eventType: 'change' | 'rename' | 'unlink';
}

export interface ElectronAPI {
  ping: () => Promise<string>;
  openFolderDialog: () => Promise<string | null>;
  getWorkspacePath: () => Promise<string | null>;
  getWorkspaceState: () => Promise<WorkspaceState>;
  readDirectory: (dirPath: string) => Promise<FileSystemItem[]>;
  readFile: (filePath: string) => Promise<string>;
  closeWorkspace: () => Promise<boolean>;
  saveFile: (filePath: string, content: string) => Promise<SaveResult>;
  setActiveFile: (filePath: string) => Promise<boolean>;
  removeOpenedFile: (filePath: string) => Promise<boolean>;
  watchFile: (filePath: string) => Promise<boolean>;
  unwatchFile: (filePath: string) => Promise<boolean>;
  onFileChanged: (callback: (change: FileChange) => void) => () => void;
}
