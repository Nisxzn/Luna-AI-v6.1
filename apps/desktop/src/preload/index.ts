import { contextBridge, ipcRenderer } from 'electron';

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

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
  getWorkspacePath: () => ipcRenderer.invoke('get-workspace-path'),
  getWorkspaceState: () => ipcRenderer.invoke('get-workspace-state'),
  readDirectory: (dirPath: string) => ipcRenderer.invoke('read-directory', dirPath),
  readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),
  closeWorkspace: () => ipcRenderer.invoke('close-workspace'),
  saveFile: (filePath: string, content: string) => ipcRenderer.invoke('save-file', filePath, content),
  setActiveFile: (filePath: string) => ipcRenderer.invoke('set-active-file', filePath),
  removeOpenedFile: (filePath: string) => ipcRenderer.invoke('remove-opened-file', filePath),
  watchFile: (filePath: string) => ipcRenderer.invoke('watch-file', filePath),
  unwatchFile: (filePath: string) => ipcRenderer.invoke('unwatch-file', filePath),
  onFileChanged: (callback: (change: FileChange) => void) => {
    const listener = (_event: any, change: FileChange) => callback(change);
    ipcRenderer.on('file-changed', listener);
    return () => ipcRenderer.removeListener('file-changed', listener);
  },
});
