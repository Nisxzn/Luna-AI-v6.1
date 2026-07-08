export class ToolResultFormatter {
  formatSuccess<TOutput>(output: TOutput, executionTime: number): string {
    const outputStr = this.formatOutput(output);
    return `Tool executed successfully in ${executionTime}ms\n\nResult:\n${outputStr}`;
  }

  formatError(error: string, executionTime: number): string {
    return `Tool execution failed after ${executionTime}ms\n\nError: ${error}`;
  }

  formatOutput(output: any): string {
    if (typeof output === 'string') {
      return output;
    }
    
    if (typeof output === 'object' && output !== null) {
      try {
        return JSON.stringify(output, null, 2);
      } catch {
        return String(output);
      }
    }
    
    return String(output);
  }

  formatForAI<TOutput>(output: TOutput): string {
    // Format output specifically for AI consumption
    const outputStr = this.formatOutput(output);
    return `[TOOL_RESULT]\n${outputStr}\n[/TOOL_RESULT]`;
  }
}

export const toolResultFormatter = new ToolResultFormatter();
