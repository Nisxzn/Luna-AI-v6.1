import { watch, FSWatcher } from 'fs';
import path from 'path';

export type FileChangeEvent = 'change' | 'rename' | 'unlink';

export interface FileChange {
  filePath: string;
  eventType: FileChangeEvent;
}

export class FileWatcherService {
  private watchers: Map<string, FSWatcher> = new Map();
  private listeners: Map<string, Set<(change: FileChange) => void>> = new Map();

  /**
   * Watch a file for changes
   */
  watchFile(filePath: string, callback: (change: FileChange) => void): () => void {
    // Normalize the path
    const normalizedPath = path.normalize(filePath);

    // Add listener
    if (!this.listeners.has(normalizedPath)) {
      this.listeners.set(normalizedPath, new Set());
    }
    this.listeners.get(normalizedPath)!.add(callback);

    // Start watching if not already watching
    if (!this.watchers.has(normalizedPath)) {
      const watcher = watch(
        normalizedPath,
        (eventType, filename) => {
          if (filename) {
            const change: FileChange = {
              filePath: normalizedPath,
              eventType: eventType as FileChangeEvent,
            };
            this.notifyListeners(normalizedPath, change);
          }
        }
      );

      this.watchers.set(normalizedPath, watcher);
    }

    // Return cleanup function
    return () => {
      this.unwatchFile(normalizedPath, callback);
    };
  }

  /**
   * Stop watching a file
   */
  unwatchFile(filePath: string, callback: (change: FileChange) => void): void {
    const normalizedPath = path.normalize(filePath);
    const listeners = this.listeners.get(normalizedPath);

    if (listeners) {
      listeners.delete(callback);

      // Clean up if no more listeners
      if (listeners.size === 0) {
        this.listeners.delete(normalizedPath);
        const watcher = this.watchers.get(normalizedPath);
        if (watcher) {
          watcher.close();
          this.watchers.delete(normalizedPath);
        }
      }
    }
  }

  /**
   * Watch a directory for changes
   */
  watchDirectory(dirPath: string, callback: (change: FileChange) => void): () => void {
    const normalizedPath = path.normalize(dirPath);

    if (!this.listeners.has(normalizedPath)) {
      this.listeners.set(normalizedPath, new Set());
    }
    this.listeners.get(normalizedPath)!.add(callback);

    if (!this.watchers.has(normalizedPath)) {
      const watcher = watch(
        normalizedPath,
        { recursive: false },
        (eventType, filename) => {
          if (filename) {
            const fullPath = path.join(normalizedPath, filename);
            const change: FileChange = {
              filePath: fullPath,
              eventType: eventType as FileChangeEvent,
            };
            this.notifyListeners(normalizedPath, change);
          }
        }
      );

      this.watchers.set(normalizedPath, watcher);
    }

    return () => {
      this.unwatchFile(normalizedPath, callback);
    };
  }

  /**
   * Notify all listeners for a path
   */
  private notifyListeners(filePath: string, change: FileChange): void {
    const listeners = this.listeners.get(filePath);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(change);
        } catch (error) {
          console.error('Error in file change listener:', error);
        }
      });
    }
  }

  /**
   * Clean up all watchers
   */
  dispose(): void {
    this.watchers.forEach((watcher) => watcher.close());
    this.watchers.clear();
    this.listeners.clear();
  }
}

export const fileWatcherService = new FileWatcherService();
