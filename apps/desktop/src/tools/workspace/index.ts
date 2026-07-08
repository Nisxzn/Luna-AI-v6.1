import { z } from 'zod';
import { toolManager } from '../ToolManager';
import type { ToolDefinition } from '../types';
import { workspaceContextService } from '../../services/workspaceContext';

// Read File Tool
const readFileTool: ToolDefinition<{ path: string }, { content: string }> = {
  id: 'read_file',
  name: 'Read File',
  description: 'Read the contents of a file from the workspace',
  category: 'workspace',
  inputSchema: z.object({
    path: z.string().describe('The file path to read'),
  }),
  outputSchema: z.object({
    content: z.string().describe('The file contents'),
  }),
  permissions: ['read'],
  timeout: 10000,
  requiresApproval: false,
  execute: async ({ path }) => {
    const content = await window.electronAPI.readFile(path);
    return { content };
  },
};

// Write File Tool
const writeFileTool: ToolDefinition<{ path: string; content: string }, { success: boolean }> = {
  id: 'write_file',
  name: 'Write File',
  description: 'Write content to a file in the workspace',
  category: 'workspace',
  inputSchema: z.object({
    path: z.string().describe('The file path to write to'),
    content: z.string().describe('The content to write'),
  }),
  outputSchema: z.object({
    success: z.boolean().describe('Whether the write was successful'),
  }),
  permissions: ['write'],
  timeout: 10000,
  requiresApproval: true,
  execute: async ({ path, content }) => {
    const result = await window.electronAPI.saveFile(path, content);
    return { success: result.success };
  },
};

// List Directory Tool
const listDirectoryTool: ToolDefinition<{ path: string }, { items: Array<{ name: string; path: string; type: 'file' | 'directory' }> }> = {
  id: 'list_directory',
  name: 'List Directory',
  description: 'List the contents of a directory',
  category: 'workspace',
  inputSchema: z.object({
    path: z.string().describe('The directory path to list'),
  }),
  outputSchema: z.object({
    items: z.array(z.object({
      name: z.string(),
      path: z.string(),
      type: z.enum(['file', 'directory']),
    })),
  }),
  permissions: ['read'],
  timeout: 10000,
  requiresApproval: false,
  execute: async ({ path }) => {
    const items = await window.electronAPI.readDirectory(path);
    return { items };
  },
};

// Search Files Tool
const searchFilesTool: ToolDefinition<{ pattern: string; path?: string }, { results: Array<{ path: string; name: string }> }> = {
  id: 'search_files',
  name: 'Search Files',
  description: 'Search for files matching a pattern in the workspace',
  category: 'workspace',
  inputSchema: z.object({
    pattern: z.string().describe('The search pattern (glob)'),
    path: z.string().optional().describe('The directory to search in (defaults to workspace root)'),
  }),
  outputSchema: z.object({
    results: z.array(z.object({
      path: z.string(),
      name: z.string(),
    })),
  }),
  permissions: ['read'],
  timeout: 30000,
  requiresApproval: false,
  execute: async ({ pattern, path }) => {
    const workspace = workspaceContextService.getContext();
    const searchPath = path || workspace.workspacePath;
    if (!searchPath) {
      throw new Error('No workspace or path specified');
    }
    // This would need to be implemented in the Electron API
    // For now, return empty results
    return { results: [] };
  },
};

export function registerWorkspaceTools() {
  toolManager.registerTool(readFileTool);
  toolManager.registerTool(writeFileTool);
  toolManager.registerTool(listDirectoryTool);
  toolManager.registerTool(searchFilesTool);
}
