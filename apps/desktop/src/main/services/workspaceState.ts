import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';

export interface WorkspaceState {
  workspacePath: string | null;
  lastOpenedFiles: string[];
  activeFile: string | null;
}

const STATE_FILE_NAME = 'workspace-state.json';

export class WorkspaceStateManager {
  private state: WorkspaceState = {
    workspacePath: null,
    lastOpenedFiles: [],
    activeFile: null,
  };

  private stateFilePath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.stateFilePath = path.join(userDataPath, STATE_FILE_NAME);
  }

  /**
   * Load workspace state from disk
   */
  async load(): Promise<WorkspaceState> {
    try {
      const data = await fs.readFile(this.stateFilePath, 'utf-8');
      const parsed = JSON.parse(data);
      this.state = {
        workspacePath: parsed.workspacePath || null,
        lastOpenedFiles: parsed.lastOpenedFiles || [],
        activeFile: parsed.activeFile || null,
      };
      return this.state;
    } catch (error) {
      // File doesn't exist or is invalid, return default state
      console.log('No workspace state found, using defaults');
      return this.state;
    }
  }

  /**
   * Save workspace state to disk
   */
  async save(): Promise<void> {
    try {
      await fs.writeFile(this.stateFilePath, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving workspace state:', error);
    }
  }

  /**
   * Set workspace path
   */
  setWorkspacePath(path: string | null): void {
    this.state.workspacePath = path;
    this.save();
  }

  /**
   * Add file to last opened files
   */
  addOpenedFile(filePath: string): void {
    // Remove if already exists (to move to front)
    const index = this.state.lastOpenedFiles.indexOf(filePath);
    if (index > -1) {
      this.state.lastOpenedFiles.splice(index, 1);
    }
    // Add to front
    this.state.lastOpenedFiles.unshift(filePath);
    // Keep only last 10 files
    if (this.state.lastOpenedFiles.length > 10) {
      this.state.lastOpenedFiles = this.state.lastOpenedFiles.slice(0, 10);
    }
    this.save();
  }

  /**
   * Remove file from last opened files
   */
  removeOpenedFile(filePath: string): void {
    const index = this.state.lastOpenedFiles.indexOf(filePath);
    if (index > -1) {
      this.state.lastOpenedFiles.splice(index, 1);
    }
    if (this.state.activeFile === filePath) {
      this.state.activeFile = null;
    }
    this.save();
  }

  /**
   * Set active file
   */
  setActiveFile(filePath: string | null): void {
    this.state.activeFile = filePath;
    if (filePath) {
      this.addOpenedFile(filePath);
    }
    this.save();
  }

  /**
   * Get current state
   */
  getState(): WorkspaceState {
    return { ...this.state };
  }

  /**
   * Clear workspace state
   */
  clear(): void {
    this.state = {
      workspacePath: null,
      lastOpenedFiles: [],
      activeFile: null,
    };
    this.save();
  }
}

export const workspaceStateManager = new WorkspaceStateManager();
