import { z } from 'zod';
import { toolManager } from '../ToolManager';
import type { ToolDefinition } from '../types';
import { workspaceContextService } from '../../services/workspaceContext';

// Read package.json Tool
const readPackageJsonTool: ToolDefinition<{ path?: string }, { content: string; parsed: any }> = {
  id: 'read_package_json',
  name: 'Read package.json',
  description: 'Read and parse the package.json file from the workspace',
  category: 'project',
  inputSchema: z.object({
    path: z.string().optional().describe('Custom path to package.json (defaults to workspace root)'),
  }),
  outputSchema: z.object({
    content: z.string(),
    parsed: z.any(),
  }),
  permissions: ['read'],
  timeout: 10000,
  requiresApproval: false,
  execute: async ({ path }) => {
    const workspace = workspaceContextService.getContext();
    const packageJsonPath = path || (workspace.workspacePath ? `${workspace.workspacePath}/package.json` : 'package.json');
    const content = await window.electronAPI.readFile(packageJsonPath);
    const parsed = JSON.parse(content);
    return { content, parsed };
  },
};

// Read tsconfig.json Tool
const readTsconfigTool: ToolDefinition<{ path?: string }, { content: string; parsed: any }> = {
  id: 'read_tsconfig',
  name: 'Read tsconfig.json',
  description: 'Read and parse the tsconfig.json file from the workspace',
  category: 'project',
  inputSchema: z.object({
    path: z.string().optional().describe('Custom path to tsconfig.json (defaults to workspace root)'),
  }),
  outputSchema: z.object({
    content: z.string(),
    parsed: z.any(),
  }),
  permissions: ['read'],
  timeout: 10000,
  requiresApproval: false,
  execute: async ({ path }) => {
    const workspace = workspaceContextService.getContext();
    const tsconfigPath = path || (workspace.workspacePath ? `${workspace.workspacePath}/tsconfig.json` : 'tsconfig.json');
    const content = await window.electronAPI.readFile(tsconfigPath);
    const parsed = JSON.parse(content);
    return { content, parsed };
  },
};

// Detect Framework Tool
const detectFrameworkTool: ToolDefinition<{}, { framework: string | null; confidence: number }> = {
  id: 'detect_framework',
  name: 'Detect Framework',
  description: 'Detect the framework used in the current workspace',
  category: 'project',
  inputSchema: z.object({}),
  outputSchema: z.object({
    framework: z.string().nullable(),
    confidence: z.number(),
  }),
  permissions: ['read'],
  timeout: 10000,
  requiresApproval: false,
  execute: async () => {
    const workspace = workspaceContextService.getContext();
    if (!workspace.workspacePath) {
      return { framework: null, confidence: 0 };
    }

    try {
      const packageJsonPath = `${workspace.workspacePath}/package.json`;
      const content = await window.electronAPI.readFile(packageJsonPath);
      const parsed = JSON.parse(content);

      const dependencies = { ...parsed.dependencies, ...parsed.devDependencies };
      
      // Framework detection logic
      if (dependencies['next'] || dependencies['react'] && dependencies['next']) {
        return { framework: 'Next.js', confidence: 0.9 };
      }
      if (dependencies['react'] && dependencies['react-dom']) {
        return { framework: 'React', confidence: 0.8 };
      }
      if (dependencies['vue'] || dependencies['@vue/core']) {
        return { framework: 'Vue', confidence: 0.9 };
      }
      if (dependencies['@angular/core']) {
        return { framework: 'Angular', confidence: 0.9 };
      }
      if (dependencies['svelte']) {
        return { framework: 'Svelte', confidence: 0.9 };
      }
      if (dependencies['solid-js']) {
        return { framework: 'Solid', confidence: 0.9 };
      }

      return { framework: null, confidence: 0 };
    } catch {
      return { framework: null, confidence: 0 };
    }
  },
};

// Detect Package Manager Tool
const detectPackageManagerTool: ToolDefinition<{}, { packageManager: string | null }> = {
  id: 'detect_package_manager',
  name: 'Detect Package Manager',
  description: 'Detect the package manager used in the workspace',
  category: 'project',
  inputSchema: z.object({}),
  outputSchema: z.object({
    packageManager: z.string().nullable(),
  }),
  permissions: ['read'],
  timeout: 10000,
  requiresApproval: false,
  execute: async () => {
    const workspace = workspaceContextService.getContext();
    if (!workspace.workspacePath) {
      return { packageManager: null };
    }

    try {
      // Check for lock files
      const lockFiles = ['pnpm-lock.yaml', 'yarn.lock', 'package-lock.json'];
      
      for (const lockFile of lockFiles) {
        try {
          await window.electronAPI.readFile(`${workspace.workspacePath}/${lockFile}`);
          
          if (lockFile === 'pnpm-lock.yaml') return { packageManager: 'pnpm' };
          if (lockFile === 'yarn.lock') return { packageManager: 'yarn' };
          if (lockFile === 'package-lock.json') return { packageManager: 'npm' };
        } catch {
          continue;
        }
      }

      // Check for workspace config
      try {
        await window.electronAPI.readFile(`${workspace.workspacePath}/pnpm-workspace.yaml`);
        return { packageManager: 'pnpm' };
      } catch {}

      try {
        await window.electronAPI.readFile(`${workspace.workspacePath}/yarn.lock`);
        return { packageManager: 'yarn' };
      } catch {}

      return { packageManager: null };
    } catch {
      return { packageManager: null };
    }
  },
};

export function registerProjectTools() {
  toolManager.registerTool(readPackageJsonTool);
  toolManager.registerTool(readTsconfigTool);
  toolManager.registerTool(detectFrameworkTool);
  toolManager.registerTool(detectPackageManagerTool);
}
