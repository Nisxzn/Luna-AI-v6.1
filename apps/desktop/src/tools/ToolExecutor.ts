import { ToolDefinition, ToolExecutionResult } from './types';
import { toolValidator } from './ToolValidator';
import { toolLogger } from './ToolLogger';
import { permissionManager } from './PermissionManager';
import { toolResultFormatter } from './ToolResultFormatter';

export class ToolExecutor {
  private executionStack: Set<string> = new Set();
  private maxRecursionDepth: number = 10;

  async execute<TInput, TOutput>(
    tool: ToolDefinition<TInput, TOutput>,
    input: unknown,
    autoApprove: boolean = false
  ): Promise<ToolExecutionResult<TOutput>> {
    const startTime = Date.now();

    // Check for recursive tool calls
    if (this.executionStack.has(tool.id)) {
      return {
        success: false,
        output: null as any,
        error: 'Recursive tool call detected',
        executionTime: Date.now() - startTime,
      };
    }

    if (this.executionStack.size >= this.maxRecursionDepth) {
      return {
        success: false,
        output: null as any,
        error: 'Maximum recursion depth exceeded',
        executionTime: Date.now() - startTime,
      };
    }

    this.executionStack.add(tool.id);

    try {
      // Validate input
      const validation = toolValidator.validateInput(tool, input);
      if (!validation.valid) {
        return {
          success: false,
          output: null as any,
          error: validation.error,
          executionTime: Date.now() - startTime,
        };
      }

      const validatedInput = validation.data!;

      // Check permissions
      let approved = false;
      if (tool.requiresApproval && !autoApprove) {
        const permissionResponse = await permissionManager.requestPermission({
          toolId: tool.id,
          toolName: tool.name,
          description: tool.description,
          input: validatedInput,
          permissions: tool.permissions,
        });
        approved = permissionResponse === 'approved';
      } else {
        approved = true;
      }

      if (!approved) {
        return {
          success: false,
          output: null as any,
          error: 'Permission denied',
          executionTime: Date.now() - startTime,
        };
      }

      // Execute with timeout
      const output = await this.executeWithTimeout(tool, validatedInput);

      // Validate output
      const outputValidation = toolValidator.validateOutput(tool, output);
      if (!outputValidation.valid) {
        return {
          success: false,
          output: null as any,
          error: `Output validation failed: ${outputValidation.error}`,
          executionTime: Date.now() - startTime,
        };
      }

      const executionTime = Date.now() - startTime;

      // Log successful execution
      toolLogger.log({
        toolId: tool.id,
        timestamp: Date.now(),
        input: validatedInput,
        output: outputValidation.data,
        success: true,
        executionTime,
        approved,
      });

      return {
        success: true,
        output: outputValidation.data,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Log failed execution
      toolLogger.log({
        toolId: tool.id,
        timestamp: Date.now(),
        input,
        output: null,
        success: false,
        error: errorMessage,
        executionTime,
        approved: true,
      });

      return {
        success: false,
        output: null as any,
        error: errorMessage,
        executionTime,
      };
    } finally {
      this.executionStack.delete(tool.id);
    }
  }

  private async executeWithTimeout<TInput, TOutput>(
    tool: ToolDefinition<TInput, TOutput>,
    input: TInput
  ): Promise<TOutput> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Tool execution timeout after ${tool.timeout}ms`));
      }, tool.timeout);

      tool
        .execute(input)
        .then(resolve)
        .catch(reject)
        .finally(() => {
          clearTimeout(timeoutId);
        });
    });
  }

  getExecutionStack(): string[] {
    return Array.from(this.executionStack);
  }

  clearExecutionStack(): void {
    this.executionStack.clear();
  }
}

export const toolExecutor = new ToolExecutor();
