/**
 * Context Manager
 * Manages context window and token limits for conversations
 */

import type { Message } from '../types';
import { tokenCounter } from './TokenCounter';

export interface MemoryContext {
  memories: string[];
  context: string;
}

export interface ContextConfig {
  maxTokens: number;
  reservedTokens: number;
  systemPromptTokens?: number;
  responseTokens?: number;
}

export class ContextManager {
  private config: ContextConfig = {
    maxTokens: 4096,
    reservedTokens: 500,
    systemPromptTokens: 100,
    responseTokens: 1000,
  };
  private memoryContext?: MemoryContext;

  /**
   * Configure context limits
   */
  configure(config: Partial<ContextConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ContextConfig {
    return { ...this.config };
  }

  /**
   * Calculate available tokens for messages
   */
  calculateAvailableTokens(): number {
    const { maxTokens, reservedTokens, systemPromptTokens, responseTokens } = this.config;
    return maxTokens - reservedTokens - (systemPromptTokens || 0) - (responseTokens || 0);
  }

  /**
   * Check if messages fit within context window
   */
  fitsInContext(messages: Message[], model?: string): boolean {
    const availableTokens = this.calculateAvailableTokens();
    const usedTokens = tokenCounter.estimateForMessages(messages);
    return usedTokens <= availableTokens;
  }

  /**
   * Truncate messages to fit within context window
   */
  truncateToFit(messages: Message[], model?: string): Message[] {
    const availableTokens = this.calculateAvailableTokens();
    let currentTokens = 0;
    const truncatedMessages: Message[] = [];

    // Process in reverse to keep most recent messages
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const messageTokens = model ? tokenCounter.estimateForModel(message.content || '', model) : tokenCounter.estimateHybrid(message.content || '');

      if (currentTokens + messageTokens <= availableTokens) {
        truncatedMessages.unshift(message);
        currentTokens += messageTokens;
      } else {
        // Try to truncate the message itself
        const remainingTokens = availableTokens - currentTokens;
        if (remainingTokens > 50) {
          // Only include if we have meaningful space left
          const truncatedContent = model ? tokenCounter.truncateToTokenLimit(message.content || '', remainingTokens, model) : tokenCounter.truncateToTokenLimit(message.content || '', remainingTokens);
          truncatedMessages.unshift({
            ...message,
            content: truncatedContent,
          });
        }
        break;
      }
    }

    return truncatedMessages;
  }

  /**
   * Optimize context by removing less important messages
   */
  optimizeContext(
    messages: Message[],
    importanceFn?: (message: Message) => number,
    model?: string
  ): Message[] {
    if (this.fitsInContext(messages, model)) {
      return messages;
    }

    // If no importance function provided, use default strategy
    if (!importanceFn) {
      return this.truncateToFit(messages, model);
    }

    // Sort messages by importance (higher = more important)
    const sortedMessages = [...messages].sort((a, b) => importanceFn(b) - importanceFn(a));

    // Keep most important messages that fit
    const availableTokens = this.calculateAvailableTokens();
    let currentTokens = 0;
    const optimizedMessages: Message[] = [];

    for (const message of sortedMessages) {
      const messageTokens = model ? tokenCounter.estimateForModel(message.content || '', model) : tokenCounter.estimateHybrid(message.content || '');

      if (currentTokens + messageTokens <= availableTokens) {
        optimizedMessages.push(message);
        currentTokens += messageTokens;
      }
    }

    // Restore original order
    const messageSet = new Set(optimizedMessages);
    return messages.filter((m) => messageSet.has(m));
  }

  /**
   * Get context usage statistics
   */
  getContextStats(messages: Message[], model?: string): {
    totalTokens: number;
    availableTokens: number;
    usedTokens: number;
    remainingTokens: number;
    usagePercentage: number;
    messageCount: number;
    canFit: boolean;
  } {
    const totalTokens = this.config.maxTokens;
    const availableTokens = this.calculateAvailableTokens();
    const usedTokens = tokenCounter.estimateForMessages(messages);
    const remainingTokens = Math.max(0, availableTokens - usedTokens);
    const usagePercentage = (usedTokens / availableTokens) * 100;

    return {
      totalTokens,
      availableTokens,
      usedTokens,
      remainingTokens,
      usagePercentage,
      messageCount: messages.length,
      canFit: usedTokens <= availableTokens,
    };
  }

  /**
   * Estimate response tokens needed
   */
  estimateResponseTokens(prompt: string, model?: string): number {
    // Heuristic: response is typically 20-50% of prompt length
    const promptTokens = model ? tokenCounter.estimateForModel(prompt, model) : tokenCounter.estimateHybrid(prompt);
    return Math.min(this.config.responseTokens || 1000, Math.ceil(promptTokens * 0.5));
  }

  /**
   * Adjust context for different models
   */
  adjustForModel(model: string): void {
    const modelLower = model.toLowerCase();

    if (modelLower.includes('gpt-4')) {
      this.config.maxTokens = 128000;
      this.config.responseTokens = 4096;
    } else if (modelLower.includes('gpt-3.5')) {
      this.config.maxTokens = 16385;
      this.config.responseTokens = 4096;
    } else if (modelLower.includes('claude')) {
      this.config.maxTokens = 200000;
      this.config.responseTokens = 8192;
    } else if (modelLower.includes('gemini')) {
      this.config.maxTokens = 2800000;
      this.config.responseTokens = 8192;
    } else if (modelLower.includes('llama') || modelLower.includes('mistral')) {
      this.config.maxTokens = 8192;
      this.config.responseTokens = 2048;
    }
  }

  /**
   * Reset to default configuration
   */
  reset(): void {
    this.config = {
      maxTokens: 4096,
      reservedTokens: 500,
      systemPromptTokens: 100,
      responseTokens: 1000,
    };
    this.memoryContext = undefined;
  }

  /**
   * Set memory context for the conversation
   */
  setMemoryContext(memoryContext: MemoryContext): void {
    this.memoryContext = memoryContext;
  }

  /**
   * Get current memory context
   */
  getMemoryContext(): MemoryContext | undefined {
    return this.memoryContext;
  }

  /**
   * Clear memory context
   */
  clearMemoryContext(): void {
    this.memoryContext = undefined;
  }

  /**
   * Build context with memory included
   */
  buildContextWithMemory(messages: Message[], model?: string): Message[] {
    const contextMessages = [...messages];

    if (this.memoryContext && this.memoryContext.memories.length > 0) {
      const memoryMessage: Message = {
        role: 'system',
        content: `Relevant context from memory:\n${this.memoryContext.context}`,
      };
      contextMessages.unshift(memoryMessage);
    }

    return contextMessages;
  }
}

export const contextManager = new ContextManager();
