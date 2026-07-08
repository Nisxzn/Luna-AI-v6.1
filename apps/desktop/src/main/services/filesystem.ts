import fs from 'fs/promises';
import path from 'path';
import { Stats } from 'fs';

export interface FileSystemItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileSystemItem[];
}

export class FileSystemService {
  /**
   * Read directory contents recursively
   */
  async readDirectory(dirPath: string, maxDepth = 10, currentDepth = 0): Promise<FileSystemItem[]> {
    if (currentDepth >= maxDepth) {
      return [];
    }

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const items: FileSystemItem[] = [];

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        // Skip hidden files and directories (starting with .)
        if (entry.name.startsWith('.')) {
          continue;
        }

        // Skip node_modules and other common ignore patterns
        if (['node_modules', '.git', 'dist', 'build', 'coverage'].includes(entry.name)) {
          continue;
        }

        if (entry.isDirectory()) {
          items.push({
            name: entry.name,
            path: fullPath,
            type: 'directory',
            children: await this.readDirectory(fullPath, maxDepth, currentDepth + 1),
          });
        } else {
          items.push({
            name: entry.name,
            path: fullPath,
            type: 'file',
          });
        }
      }

      // Sort: directories first, then files, both alphabetically
      return items.sort((a, b) => {
        if (a.type === b.type) {
          return a.name.localeCompare(b.name);
        }
        return a.type === 'directory' ? -1 : 1;
      });
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
      return [];
    }
  }

  /**
   * Read file contents
   */
  async readFile(filePath: string): Promise<string> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Write file contents
   */
  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      console.error(`Error writing file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Check if a path exists
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file stats
   */
  async getStats(filePath: string): Promise<Stats | null> {
    try {
      return await fs.stat(filePath);
    } catch (error) {
      console.error(`Error getting stats for ${filePath}:`, error);
      return null;
    }
  }
}

export const fileSystemService = new FileSystemService();
