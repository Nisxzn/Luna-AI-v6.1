import { chatService, streamingEngine } from '@luna-ai/ai';
import type { Message, ChatCompletionRequest, StreamCallback, StreamEvent } from '@luna-ai/ai';
import { contextBuilder } from './contextBuilder';
import { editorContextService } from './editorContext';

export type CodeActionType =
  | 'explain'
  | 'improve'
  | 'refactor'
  | 'optimize'
  | 'fix'
  | 'document'
  | 'comment'
  | 'test'
  | 'convert'
  | 'complete'
  | 'continue';

export interface CodeAction {
  id: CodeActionType;
  label: string;
  description: string;
  requiresSelection: boolean;
  icon: string;
}

export interface CodeActionRequest {
  action: CodeActionType;
  selectedText?: string;
  targetLanguage?: string;
  customInstruction?: string;
}

export interface CodeActionResult {
  originalText: string;
  modifiedText: string;
  explanation?: string;
  action: CodeActionType;
}

export const CODE_ACTIONS: CodeAction[] = [
  {
    id: 'explain',
    label: 'Explain Code',
    description: 'Explain what this code does',
    requiresSelection: true,
    icon: '💡',
  },
  {
    id: 'improve',
    label: 'Improve Code',
    description: 'Improve the quality and readability',
    requiresSelection: true,
    icon: '✨',
  },
  {
    id: 'refactor',
    label: 'Refactor',
    description: 'Refactor for better structure',
    requiresSelection: true,
    icon: '🔄',
  },
  {
    id: 'optimize',
    label: 'Optimize Performance',
    description: 'Optimize for better performance',
    requiresSelection: true,
    icon: '⚡',
  },
  {
    id: 'fix',
    label: 'Fix Bugs',
    description: 'Identify and fix potential bugs',
    requiresSelection: true,
    icon: '🐛',
  },
  {
    id: 'document',
    label: 'Generate Documentation',
    description: 'Add comprehensive documentation',
    requiresSelection: true,
    icon: '📝',
  },
  {
    id: 'comment',
    label: 'Add Comments',
    description: 'Add inline comments',
    requiresSelection: true,
    icon: '💬',
  },
  {
    id: 'test',
    label: 'Generate Tests',
    description: 'Generate unit tests',
    requiresSelection: true,
    icon: '🧪',
  },
  {
    id: 'convert',
    label: 'Convert Language',
    description: 'Convert to another language',
    requiresSelection: true,
    icon: '🔄',
  },
  {
    id: 'complete',
    label: 'Complete Function',
    description: 'Complete the selected function',
    requiresSelection: true,
    icon: '✅',
  },
  {
    id: 'continue',
    label: 'Continue Writing',
    description: 'Continue writing code',
    requiresSelection: false,
    icon: '➡️',
  },
];

export class CodeActionsService {
  private abortController: AbortController | null = null;

  /**
   * Get prompt for a specific action
   */
  private getActionPrompt(action: CodeActionType, context: string): string {
    const prompts: Record<CodeActionType, string> = {
      explain: `You are an expert code explainer. Explain the following code clearly and concisely. Focus on what it does, how it works, and any important patterns or concepts.\n\n${context}`,
      improve: `You are an expert code reviewer. Improve the following code for better readability, maintainability, and best practices. Return ONLY the improved code without explanation.\n\n${context}`,
      refactor: `You are an expert code architect. Refactor the following code for better structure, separation of concerns, and design patterns. Return ONLY the refactored code without explanation.\n\n${context}`,
      optimize: `You are an expert performance optimizer. Optimize the following code for better performance and efficiency. Return ONLY the optimized code without explanation.\n\n${context}`,
      fix: `You are an expert debugger. Identify and fix any bugs in the following code. Return ONLY the fixed code without explanation.\n\n${context}`,
      document: `You are an expert technical writer. Add comprehensive documentation (JSDoc/Docstrings) to the following code. Return the code with documentation included.\n\n${context}`,
      comment: `You are an expert code commenter. Add helpful inline comments to explain complex logic in the following code. Return the code with comments included.\n\n${context}`,
      test: `You are an expert test engineer. Generate comprehensive unit tests for the following code. Return ONLY the test code without explanation.\n\n${context}`,
      convert: `You are an expert polyglot programmer. Convert the following code to the target language. Return ONLY the converted code without explanation.\n\n${context}`,
      complete: `You are an expert programmer. Complete the selected function based on its signature and context. Return ONLY the completed function without explanation.\n\n${context}`,
      continue: `You are an expert programmer. Continue writing code based on the current context. Write the next logical lines of code. Return ONLY the code to append without explanation.\n\n${context}`,
    };

    return prompts[action];
  }

  /**
   * Execute a code action
   */
  async executeAction(
    request: CodeActionRequest,
    onProgress?: (content: string) => void
  ): Promise<CodeActionResult> {
    const editorContext = editorContextService.getContext();
    const selectedText = request.selectedText || editorContext.selection?.text || '';
    const originalText = selectedText || editorContext.content;

    // Build context
    const workspaceContext = contextBuilder.buildContext({
      maxTokens: 3000,
      includeWorkspace: true,
      includeEditor: true,
      includeFileTree: false,
      includeOpenFiles: true,
      includeSelectedText: true,
      includeNearbyCode: true,
      nearbyCodeLines: 5,
    });

    // Build the code context
    let codeContext = '';
    if (selectedText) {
      codeContext = `Selected Code:\n\`\`\`${editorContext.language}\n${selectedText}\n\`\`\``;
    } else {
      codeContext = `Current File:\n\`\`\`${editorContext.language}\n${editorContext.content}\n\`\`\``;
    }

    // Add custom instruction if provided
    if (request.customInstruction) {
      codeContext += `\n\nAdditional Instruction: ${request.customInstruction}`;
    }

    // Add target language for conversion
    if (request.action === 'convert' && request.targetLanguage) {
      codeContext += `\n\nTarget Language: ${request.targetLanguage}`;
    }

    // Combine workspace context with code context
    const fullContext = workspaceContext ? `${workspaceContext}\n\n${codeContext}` : codeContext;

    // Get action prompt
    const prompt = this.getActionPrompt(request.action, fullContext);

    // Prepare request
    const messages: Message[] = [
      {
        role: 'system',
        content: 'You are an expert AI programming assistant. Always respond with code only unless explicitly asked for explanation. Do not include markdown code blocks in your response - just the raw code.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    const chatRequest: ChatCompletionRequest = {
      messages,
      model: 'gpt-4o-mini',
      temperature: 0.3,
      maxTokens: 4096,
      stream: true,
    };

    this.abortController = new AbortController();

    let modifiedText = '';

    try {
      await streamingEngine.stream(
        async (callback: StreamCallback) => {
          await chatService.streamChatCompletion(chatRequest, callback);
        },
        {
          onChunk: (chunk) => {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              modifiedText += content;
              onProgress?.(modifiedText);
            }
          },
        }
      );
    } catch (error) {
      throw new Error(`Failed to execute action: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.abortController = null;
    }

    // Clean up the response (remove markdown code blocks if present)
    modifiedText = this.cleanCodeResponse(modifiedText);

    return {
      originalText,
      modifiedText,
      action: request.action,
    };
  }

  /**
   * Clean code response by removing markdown code blocks
   */
  private cleanCodeResponse(text: string): string {
    // Remove markdown code blocks (```language ... ```)
    let cleaned = text.replace(/```[\w]*\n?/g, '').replace(/```/g, '');
    
    // Trim whitespace
    cleaned = cleaned.trim();
    
    return cleaned;
  }

  /**
   * Stop the current action
   */
  stopAction(): void {
    if (this.abortController) {
      this.abortController.abort();
      streamingEngine.abort();
      this.abortController = null;
    }
  }

  /**
   * Check if an action is available
   */
  isActionAvailable(action: CodeAction, hasSelection: boolean): boolean {
    if (action.requiresSelection && !hasSelection) {
      return false;
    }
    return true;
  }

  /**
   * Get available actions based on current state
   */
  getAvailableActions(hasSelection: boolean): CodeAction[] {
    return CODE_ACTIONS.filter((action) => this.isActionAvailable(action, hasSelection));
  }
}

export const codeActionsService = new CodeActionsService();
