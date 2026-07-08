/**
 * Token Counter
 * Estimates token counts for text using various strategies
 */

export class TokenCounter {
  /**
   * Estimate token count using character-based approximation
   * Roughly 4 characters per token for English text
   */
  estimateByCharacters(text: string, charsPerToken: number = 4): number {
    return Math.ceil(text.length / charsPerToken);
  }

  /**
   * Estimate token count using word-based approximation
   * Roughly 1.3 tokens per word for English text
   */
  estimateByWords(text: string, tokensPerWord: number = 1.3): number {
    const words = text.trim().split(/\s+/).filter((w) => w.length > 0);
    return Math.ceil(words.length * tokensPerWord);
  }

  /**
   * Estimate token count using a hybrid approach
   * Combines character and word estimates
   */
  estimateHybrid(text: string): number {
    const charEstimate = this.estimateByCharacters(text);
    const wordEstimate = this.estimateByWords(text);
    return Math.ceil((charEstimate + wordEstimate) / 2);
  }

  /**
   * Count tokens for code (more accurate approximation)
   * Code typically has more tokens per character than natural language
   */
  estimateForCode(text: string): number {
    // Code has more symbols and shorter tokens
    const lines = text.split('\n');
    let tokenCount = 0;

    for (const line of lines) {
      // Each line typically has 2-3 tokens per operator/keyword
      const operators = (line.match(/[=+\-*/%&|^!<>?:;,.(){}\[\]]/g) || []).length;
      const words = line.trim().split(/\s+/).filter((w) => w.length > 0).length;
      
      tokenCount += words + operators;
    }

    return Math.max(tokenCount, this.estimateByCharacters(text, 3));
  }

  /**
   * Count tokens for a message array
   */
  estimateForMessages(messages: Array<{ content: string }>): number {
    let totalTokens = 0;

    for (const message of messages) {
      totalTokens += this.estimateHybrid(message.content);
    }

    return totalTokens;
  }

  /**
   * Count tokens with model-specific adjustments
   */
  estimateForModel(text: string, model: string): number {
    // Different models have different tokenization
    const modelLower = model.toLowerCase();

    if (modelLower.includes('gpt-3') || modelLower.includes('gpt-4')) {
      // OpenAI models use tiktoken
      return this.estimateByCharacters(text, 4);
    } else if (modelLower.includes('claude')) {
      // Anthropic models
      return this.estimateByCharacters(text, 3.5);
    } else if (modelLower.includes('gemini')) {
      // Google models
      return this.estimateByCharacters(text, 4);
    } else if (modelLower.includes('llama') || modelLower.includes('mistral')) {
      // Open source models
      return this.estimateByCharacters(text, 3);
    }

    // Default estimation
    return this.estimateHybrid(text);
  }

  /**
   * Calculate context window usage
   */
  calculateContextUsage(
    messages: Array<{ content: string }>,
    maxContextTokens: number,
    model?: string
  ): {
    usedTokens: number;
    remainingTokens: number;
    usagePercentage: number;
  } {
    const usedTokens = model
      ? this.estimateForMessages(messages)
      : this.estimateForMessages(messages);

    const remainingTokens = Math.max(0, maxContextTokens - usedTokens);
    const usagePercentage = (usedTokens / maxContextTokens) * 100;

    return {
      usedTokens,
      remainingTokens,
      usagePercentage,
    };
  }

  /**
   * Truncate text to fit within token limit
   */
  truncateToTokenLimit(text: string, maxTokens: number, model?: string): string {
    const estimate = model
      ? this.estimateForModel(text, model)
      : this.estimateHybrid(text);

    if (estimate <= maxTokens) {
      return text;
    }

    // Simple truncation by character count
    const ratio = maxTokens / estimate;
    const targetLength = Math.floor(text.length * ratio);
    return text.slice(0, targetLength);
  }

  /**
   * Get token count statistics
   */
  getStatistics(text: string): {
    characterCount: number;
    wordCount: number;
    lineCount: number;
    charEstimate: number;
    wordEstimate: number;
    hybridEstimate: number;
  } {
    return {
      characterCount: text.length,
      wordCount: text.trim().split(/\s+/).filter((w) => w.length > 0).length,
      lineCount: text.split('\n').length,
      charEstimate: this.estimateByCharacters(text),
      wordEstimate: this.estimateByWords(text),
      hybridEstimate: this.estimateHybrid(text),
    };
  }
}

export const tokenCounter = new TokenCounter();
