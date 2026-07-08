import { z } from 'zod';

export type ToolCategory = 'workspace' | 'editor' | 'terminal' | 'project';

export type ToolPermission = 'read' | 'write' | 'execute' | 'admin';

export interface ToolDefinition<TInput = any, TOutput = any> {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  inputSchema: z.ZodSchema<TInput>;
  outputSchema: z.ZodSchema<TOutput>;
  permissions: ToolPermission[];
  timeout: number;
  requiresApproval: boolean;
  execute: (input: TInput) => Promise<TOutput>;
}

export interface ToolExecutionResult<TOutput = any> {
  success: boolean;
  output: TOutput;
  error?: string;
  executionTime: number;
}

export interface ToolExecutionLog {
  toolId: string;
  timestamp: number;
  input: any;
  output: any;
  success: boolean;
  error?: string;
  executionTime: number;
  approved: boolean;
}

export interface ToolPermissionRequest {
  toolId: string;
  toolName: string;
  description: string;
  input: any;
  permissions: ToolPermission[];
}

export type ToolPermissionResponse = 'approved' | 'denied' | 'cancelled';
