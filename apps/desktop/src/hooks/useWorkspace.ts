import { useState, useEffect, useCallback } from 'react';

export interface FileSystemItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileSystemItem[];
}

export interface WorkspaceState {
  workspacePath: string | null;
  lastOpenedFiles: string[];
  activeFile: string | null;
}

export const useWorkspace = () => {
  const [workspacePath, setWorkspacePath] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileSystemItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>({
    workspacePath: null,
    lastOpenedFiles: [],
    activeFile: null,
  });

  // Load workspace state on mount
  useEffect(() => {
    const loadWorkspaceState = async () => {
      try {
        const state = await window.electronAPI.getWorkspaceState();
        setWorkspaceState(state);
        if (state.workspacePath) {
          setWorkspacePath(state.workspacePath);
          await loadFileTree(state.workspacePath);
        }
      } catch (err) {
        console.error('Error loading workspace state:', err);
      }
    };

    loadWorkspaceState();
  }, []);

  const loadFileTree = useCallback(async (path: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const tree = await window.electronAPI.readDirectory(path);
      setFileTree(tree);
    } catch (err) {
      console.error('Error loading file tree:', err);
      setError('Failed to load file tree');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openFolder = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const path = await window.electronAPI.openFolderDialog();
      if (path) {
        setWorkspacePath(path);
        await loadFileTree(path);
      }
    } catch (err) {
      console.error('Error opening folder:', err);
      setError('Failed to open folder');
    } finally {
      setIsLoading(false);
    }
  }, [loadFileTree]);

  const closeWorkspace = useCallback(async () => {
    try {
      await window.electronAPI.closeWorkspace();
      setWorkspacePath(null);
      setFileTree([]);
      setWorkspaceState({
        workspacePath: null,
        lastOpenedFiles: [],
        activeFile: null,
      });
    } catch (err) {
      console.error('Error closing workspace:', err);
      setError('Failed to close workspace');
    }
  }, []);

  const readFile = useCallback(async (filePath: string): Promise<string> => {
    try {
      return await window.electronAPI.readFile(filePath);
    } catch (err) {
      console.error('Error reading file:', err);
      throw err;
    }
  }, []);

  const saveFile = useCallback(async (filePath: string, content: string): Promise<boolean> => {
    try {
      const result = await window.electronAPI.saveFile(filePath, content);
      return result.success;
    } catch (err) {
      console.error('Error saving file:', err);
      return false;
    }
  }, []);

  const setActiveFile = useCallback(async (filePath: string) => {
    try {
      await window.electronAPI.setActiveFile(filePath);
      setWorkspaceState((prev) => ({ ...prev, activeFile: filePath }));
    } catch (err) {
      console.error('Error setting active file:', err);
    }
  }, []);

  const removeOpenedFile = useCallback(async (filePath: string) => {
    try {
      await window.electronAPI.removeOpenedFile(filePath);
      setWorkspaceState((prev) => ({
        ...prev,
        lastOpenedFiles: prev.lastOpenedFiles.filter((f) => f !== filePath),
        activeFile: prev.activeFile === filePath ? null : prev.activeFile,
      }));
    } catch (err) {
      console.error('Error removing opened file:', err);
    }
  }, []);

  return {
    workspacePath,
    fileTree,
    isLoading,
    error,
    workspaceState,
    openFolder,
    closeWorkspace,
    readFile,
    saveFile,
    setActiveFile,
    removeOpenedFile,
    refresh: () => workspacePath && loadFileTree(workspacePath),
  };
};
