import { toolRegistry } from './ToolRegistry';
import { toolExecutor } from './ToolExecutor';
import { toolLogger } from './ToolLogger';
import { toolResultFormatter } from './ToolResultFormatter';
import type { ToolDefinition, ToolExecutionResult, ToolPermissionRequest } from './types';

export class ToolManager {
  async executeTool<TInput, TOutput>(
    toolId: string,
    input: unknown,
    autoApprove: boolean = false
  ): Promise<ToolExecutionResult<TOutput>> {
    const tool = toolRegistry.get(toolId);
    
    if (!tool) {
      return {
        success: false,
        output: null as any,
        error: `Tool "${toolId}" not found`,
        executionTime: 0,
      };
    }

    return await toolExecutor.execute(tool, input, autoApprove);
  }

  getTool(toolId: string): ToolDefinition | undefined {
    return toolRegistry.get(toolId);
  }

  getAllTools(): ToolDefinition[] {
    return toolRegistry.getAll();
  }

  getToolsByCategory(category: string): ToolDefinition[] {
    return toolRegistry.getByCategory(category);
  }

  registerTool<TInput, TOutput>(tool: ToolDefinition<TInput, TOutput>): void {
    toolRegistry.register(tool);
  }

  unregisterTool(toolId: string): boolean {
    return toolRegistry.unregister(toolId);
  }

  getLogs(toolId?: string) {
    return toolLogger.getLogs(toolId);
  }

  getStats() {
    return toolLogger.getStats();
  }

  formatToolResult<TOutput>(result: ToolExecutionResult<TOutput>): string {
    if (result.success) {
      return toolResultFormatter.formatSuccess(result.output, result.executionTime);
    } else {
      return toolResultFormatter.formatError(result.error || 'Unknown error', result.executionTime);
    }
  }

  formatForAI<TOutput>(output: TOutput): string {
    return toolResultFormatter.formatForAI(output);
  }

  createPermissionRequest(toolId: string, input: any): ToolPermissionRequest | null {
    const tool = toolRegistry.get(toolId);
    if (!tool) return null;

    return {
      toolId: tool.id,
      toolName: tool.name,
      description: tool.description,
      input,
      permissions: tool.permissions,
    };
  }
}

export const toolManager = new ToolManager();
