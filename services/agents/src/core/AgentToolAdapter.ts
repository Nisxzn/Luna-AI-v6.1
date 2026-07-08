import {
  AgentToolAdapter as IAgentToolAdapter,
  ToolExecutionContext,
  ToolExecutionResult,
} from '@luna-ai/types';

export class AgentToolAdapter implements IAgentToolAdapter {
  private availableTools: Map<string, (params: Record<string, unknown>) => Promise<unknown>>;
  private agentToolPermissions: Map<string, Set<string>>;

  constructor() {
    this.availableTools = new Map();
    this.agentToolPermissions = new Map();
  }

  registerTool(name: string, handler: (params: Record<string, unknown>) => Promise<unknown>): void {
    this.availableTools.set(name, handler);
  }

  setAgentPermissions(agentId: string, toolNames: string[]): void {
    this.agentToolPermissions.set(agentId, new Set(toolNames));
  }

  async executeTool(context: ToolExecutionContext): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    // Validate tool access
    const hasAccess = await this.validateToolAccess(context.agentId, context.toolName);
    if (!hasAccess) {
      return {
        success: false,
        error: `Agent ${context.agentId} does not have permission to use tool ${context.toolName}`,
        executionTime: Date.now() - startTime,
      };
    }

    // Execute tool
    try {
      const tool = this.availableTools.get(context.toolName);
      if (!tool) {
        return {
          success: false,
          error: `Tool ${context.toolName} not found`,
          executionTime: Date.now() - startTime,
        };
      }

      const result = await tool(context.parameters);
      return {
        success: true,
        result,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime,
      };
    }
  }

  async getAvailableTools(agentId: string): Promise<string[]> {
    const permissions = this.agentToolPermissions.get(agentId);
    if (!permissions) {
      return [];
    }
    return Array.from(permissions).filter(toolName => this.availableTools.has(toolName));
  }

  async validateToolAccess(agentId: string, toolName: string): Promise<boolean> {
    const permissions = this.agentToolPermissions.get(agentId);
    if (!permissions) {
      return false;
    }
    return permissions.has(toolName) && this.availableTools.has(toolName);
  }

  getRegisteredTools(): string[] {
    return Array.from(this.availableTools.keys());
  }
}
