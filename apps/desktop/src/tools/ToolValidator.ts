import { z } from 'zod';
import { ToolDefinition } from './types';

export class ToolValidator {
  validateInput<TInput>(tool: ToolDefinition<TInput>, input: unknown): { valid: boolean; error?: string; data?: TInput } {
    try {
      const validatedData = tool.inputSchema.parse(input);
      return { valid: true, data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return { valid: false, error: `Input validation failed: ${errorMessage}` };
      }
      return { valid: false, error: 'Input validation failed' };
    }
  }

  validateOutput<TOutput>(tool: ToolDefinition<any, TOutput>, output: unknown): { valid: boolean; error?: string; data?: TOutput } {
    try {
      const validatedData = tool.outputSchema.parse(output);
      return { valid: true, data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return { valid: false, error: `Output validation failed: ${errorMessage}` };
      }
      return { valid: false, error: 'Output validation failed' };
    }
  }
}

export const toolValidator = new ToolValidator();
