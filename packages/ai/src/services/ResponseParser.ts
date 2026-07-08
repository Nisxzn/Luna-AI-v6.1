/**
 * Response Parser
 * Parses and processes AI responses
 */

import type { ChatCompletionResponse, Message } from '../types';

export interface ParsedResponse {
  content: string;
  metadata?: Record<string, unknown>;
  codeBlocks?: Array<{
    language: string;
    code: string;
  }>;
  citations?: string[];
  thoughts?: string;
}

export class ResponseParser {
  /**
   * Parse a chat completion response
   */
  parseResponse(response: ChatCompletionResponse): ParsedResponse {
    const content = response.choices[0]?.message?.content || '';
    return {
      content,
      metadata: {
        model: response.model,
        finishReason: response.choices[0]?.finishReason,
        usage: response.usage,
      },
      codeBlocks: this.extractCodeBlocks(content),
    };
  }

  /**
   * Extract code blocks from content
   */
  extractCodeBlocks(content: string): Array<{ language: string; code: string }> {
    const codeBlocks: Array<{ language: string; code: string }> = [];
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      codeBlocks.push({
        language: match[1] || 'plaintext',
        code: match[2].trim(),
      });
    }

    return codeBlocks;
  }

  /**
   * Extract citations from content
   */
  extractCitations(content: string): string[] {
    const citations: string[] = [];
    const regex = /\[([^\]]+)\]/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      citations.push(match[1]);
    }

    return citations;
  }

  /**
   * Extract thinking/reasoning from content
   */
  extractThoughts(content: string): string {
    const thoughtPatterns = [
      /<thinking>([\s\S]*?)<\/thinking>/i,
      /<thought>([\s\S]*?)<\/thought>/i,
      /<!-- reasoning:([\s\S]*?) -->/i,
    ];

    for (const pattern of thoughtPatterns) {
      const match = content.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return '';
  }

  /**
   * Remove code blocks from content
   */
  removeCodeBlocks(content: string): string {
    return content.replace(/```(\w+)?\n[\s\S]*?```/g, '');
  }

  /**
   * Remove citations from content
   */
  removeCitations(content: string): string {
    return content.replace(/\[[^\]]+\]/g, '');
  }

  /**
   * Remove thinking/reasoning from content
   */
  removeThoughts(content: string): string {
    const patterns = [
      /<thinking>[\s\S]*?<\/thinking>/gi,
      /<thought>[\s\S]*?<\/thought>/gi,
      /<!-- reasoning:[\s\S]*? -->/gi,
    ];

    let result = content;
    for (const pattern of patterns) {
      result = result.replace(pattern, '');
    }

    return result.trim();
  }

  /**
   * Clean response by removing metadata
   */
  cleanResponse(content: string): string {
    let cleaned = content;
    cleaned = this.removeThoughts(cleaned);
    return cleaned.trim();
  }

  /**
   * Parse JSON from response
   */
  parseJSON(content: string): unknown | null {
    // Try to find JSON in code blocks
    const codeBlocks = this.extractCodeBlocks(content);
    for (const block of codeBlocks) {
      if (block.language === 'json' || block.language === 'javascript') {
        try {
          return JSON.parse(block.code);
        } catch {
          continue;
        }
      }
    }

    // Try to parse entire content as JSON
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Parse structured data from response
   */
  parseStructuredData<T>(content: string, schema?: Record<string, unknown>): T | null {
    const json = this.parseJSON(content);
    if (json === null || typeof json !== 'object') {
      return null;
    }

    // Validate against schema if provided
    if (schema) {
      for (const key in schema) {
        if (!(key in json)) {
          return null;
        }
      }
    }

    return json as T;
  }

  /**
   * Extract action items from response
   */
  extractActionItems(content: string): string[] {
    const actionItems: string[] = [];
    const patterns = [
      /(?:^|\n)[-•]\s*(.+?)(?:\n|$)/g,
      /(?:^|\n)\d+\.\s*(.+?)(?:\n|$)/g,
      /TODO:\s*(.+?)(?:\n|$)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        actionItems.push(match[1].trim());
      }
    }

    return actionItems;
  }

  /**
   * Extract key points from response
   */
  extractKeyPoints(content: string): string[] {
    const keyPoints: string[] = [];
    const patterns = [
      /(?:^|\n)Key point:\s*(.+?)(?:\n|$)/gi,
      /(?:^|\n)Important:\s*(.+?)(?:\n|$)/gi,
      /(?:^|\n)Note:\s*(.+?)(?:\n|$)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        keyPoints.push(match[1].trim());
      }
    }

    return keyPoints;
  }

  /**
   * Format response for display
   */
  formatForDisplay(content: string): string {
    // Clean the response
    let formatted = this.cleanResponse(content);

    // Preserve code blocks
    const codeBlocks = this.extractCodeBlocks(formatted);
    formatted = this.removeCodeBlocks(formatted);

    // Format paragraphs
    formatted = formatted.split('\n\n').map((p) => p.trim()).join('\n\n');

    return formatted;
  }

  /**
   * Get response summary
   */
  getSummary(content: string, maxLength: number = 200): string {
    const cleaned = this.cleanResponse(content);
    const withoutCode = this.removeCodeBlocks(cleaned);

    if (withoutCode.length <= maxLength) {
      return withoutCode;
    }

    return withoutCode.slice(0, maxLength) + '...';
  }
}

export const responseParser = new ResponseParser();
