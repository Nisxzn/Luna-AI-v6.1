/**
 * Prompt Builder
 * Builds and formats prompts for AI models
 */

import type { Message } from '../types';

export interface PromptTemplate {
  system?: string;
  user?: string;
  variables?: Record<string, string>;
}

export class PromptBuilder {
  /**
   * Build a simple prompt from a template
   */
  buildFromTemplate(template: PromptTemplate, variables?: Record<string, string>): Message[] {
    const messages: Message[] = [];

    if (template.system) {
      const systemContent = this.replaceVariables(template.system, { ...template.variables, ...variables });
      messages.push({ role: 'system', content: systemContent });
    }

    if (template.user) {
      const userContent = this.replaceVariables(template.user, { ...template.variables, ...variables });
      messages.push({ role: 'user', content: userContent });
    }

    return messages;
  }

  /**
   * Replace variables in a template string
   */
  private replaceVariables(template: string, variables: Record<string, string>): string {
    let result = template;

    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    return result;
  }

  /**
   * Build a chat prompt from conversation history
   */
  buildChatPrompt(messages: Message[], includeSystem: boolean = true): Message[] {
    if (!includeSystem) {
      return messages.filter((m) => m.role !== 'system');
    }

    return messages;
  }

  /**
   * Build a prompt with context injection
   */
  buildWithContextPrompt(
    baseMessages: Message[],
    context: string,
    contextLabel: string = 'Context'
  ): Message[] {
    const contextMessage: Message = {
      role: 'system',
      content: `${contextLabel}:\n${context}`,
    };

    // Insert context after system message
    const messages = [...baseMessages];
    const systemIndex = messages.findIndex((m) => m.role === 'system');

    if (systemIndex >= 0) {
      messages.splice(systemIndex + 1, 0, contextMessage);
    } else {
      messages.unshift(contextMessage);
    }

    return messages;
  }

  /**
   * Build a prompt with few-shot examples
   */
  buildWithFewShotPrompt(
    baseMessages: Message[],
    examples: { input: string; output: string }[]
  ): Message[] {
    const messages = [...baseMessages];

    for (const example of examples) {
      messages.push({ role: 'user', content: example.input });
      messages.push({ role: 'assistant', content: example.output });
    }

    return messages;
  }

  /**
   * Build a prompt with instructions
   */
  buildWithInstructions(
    baseMessages: Message[],
    instructions: string
  ): Message[] {
    const instructionMessage: Message = {
      role: 'system',
      content: `Instructions:\n${instructions}`,
    };

    const messages = [...baseMessages];
    const systemIndex = messages.findIndex((m) => m.role === 'system');

    if (systemIndex >= 0) {
      messages.splice(systemIndex + 1, 0, instructionMessage);
    } else {
      messages.unshift(instructionMessage);
    }

    return messages;
  }

  /**
   * Format code for prompts
   */
  formatCode(code: string, language: string): string {
    return `\`\`\`${language}\n${code}\n\`\`\``;
  }

  /**
   * Build a code analysis prompt
   */
  buildCodeAnalysisPrompt(code: string, language: string, question?: string): Message[] {
    const formattedCode = this.formatCode(code, language);
    const userContent = question
      ? `Analyze the following code:\n${formattedCode}\n\nQuestion: ${question}`
      : `Analyze the following code:\n${formattedCode}`;

    return [
      {
        role: 'system',
        content: 'You are a code analysis expert. Provide clear, concise, and actionable insights.',
      },
      {
        role: 'user',
        content: userContent,
      },
    ];
  }

  /**
   * Build a code generation prompt
   */
  buildCodeGenerationPrompt(
    description: string,
    language: string,
    context?: string
  ): Message[] {
    const messages: Message[] = [
      {
        role: 'system',
        content: `You are a code generation expert. Write clean, efficient, and well-documented ${language} code.`,
      },
      {
        role: 'user',
        content: description,
      },
    ];

    if (context) {
      const contextMessage: Message = {
        role: 'system',
        content: `Context:\n${context}`,
      };
      messages.splice(1, 0, contextMessage);
    }

    return messages;
  }

  /**
   * Build a refactoring prompt
   */
  buildRefactoringPrompt(code: string, language: string, goals: string[]): Message[] {
    const formattedCode = this.formatCode(code, language);
    const goalsText = goals.map((g, i) => `${i + 1}. ${g}`).join('\n');

    return [
      {
        role: 'system',
        content: 'You are a code refactoring expert. Improve code quality while preserving functionality.',
      },
      {
        role: 'user',
        content: `Refactor the following ${language} code to achieve these goals:\n${goalsText}\n\nCode:\n${formattedCode}`,
      },
    ];
  }

  /**
   * Build a debugging prompt
   */
  buildDebuggingPrompt(code: string, language: string, error?: string): Message[] {
    const formattedCode = this.formatCode(code, language);
    const userContent = error
      ? `Debug the following ${language} code. Error: ${error}\n\nCode:\n${formattedCode}`
      : `Debug the following ${language} code:\n${formattedCode}`;

    return [
      {
        role: 'system',
        content: 'You are a debugging expert. Identify issues and provide fixes.',
      },
      {
        role: 'user',
        content: userContent,
      },
    ];
  }

  /**
   * Build a documentation prompt
   */
  buildDocumentationPrompt(code: string, language: string, style: 'javadoc' | 'jsdoc' | 'docstring' = 'jsdoc'): Message[] {
    const formattedCode = this.formatCode(code, language);

    return [
      {
        role: 'system',
        content: `You are a documentation expert. Generate ${style} style documentation.`,
      },
      {
        role: 'user',
        content: `Add documentation to the following ${language} code:\n${formattedCode}`,
      },
    ];
  }

  /**
   * Build a summarization prompt
   */
  buildSummarizationPrompt(text: string, maxLength?: number): Message[] {
    const maxLengthText = maxLength ? ` (maximum ${maxLength} words)` : '';

    return [
      {
        role: 'system',
        content: 'You are a summarization expert. Create concise and accurate summaries.',
      },
      {
        role: 'user',
        content: `Summarize the following text${maxLengthText}:\n\n${text}`,
      },
    ];
  }

  /**
   * Build a translation prompt
   */
  buildTranslationPrompt(text: string, targetLanguage: string): Message[] {
    return [
      {
        role: 'system',
        content: 'You are a translation expert. Provide accurate and natural translations.',
      },
      {
        role: 'user',
        content: `Translate the following text to ${targetLanguage}:\n\n${text}`,
      },
    ];
  }
}

export const promptBuilder = new PromptBuilder();
