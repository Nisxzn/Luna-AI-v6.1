/**
 * Conversation Manager
 * Manages conversation state and history
 */

import type { Message, ConversationContext } from '../types';

export class ConversationManager {
  private conversations: Map<string, ConversationContext> = new Map();

  /**
   * Create a new conversation
   */
  createConversation(systemPrompt?: string): ConversationContext {
    const id = this.generateId();
    const conversation: ConversationContext = {
      conversationId: id,
      messages: systemPrompt ? [{ role: 'system', content: systemPrompt }] : [],
      metadata: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.conversations.set(id, conversation);
    return conversation;
  }

  /**
   * Get a conversation by ID
   */
  getConversation(conversationId: string): ConversationContext | undefined {
    return this.conversations.get(conversationId);
  }

  /**
   * Get all conversations
   */
  getAllConversations(): ConversationContext[] {
    return Array.from(this.conversations.values());
  }

  /**
   * Add a message to a conversation
   */
  addMessage(conversationId: string, message: Message): ConversationContext | undefined {
    const conversation = this.conversations.get(conversationId);

    if (!conversation) {
      return undefined;
    }

    conversation.messages.push(message);
    conversation.updatedAt = Date.now();

    return conversation;
  }

  /**
   * Add multiple messages to a conversation
   */
  addMessages(conversationId: string, messages: Message[]): ConversationContext | undefined {
    const conversation = this.conversations.get(conversationId);

    if (!conversation) {
      return undefined;
    }

    conversation.messages.push(...messages);
    conversation.updatedAt = Date.now();

    return conversation;
  }

  /**
   * Update conversation metadata
   */
  updateMetadata(conversationId: string, metadata: Record<string, unknown>): boolean {
    const conversation = this.conversations.get(conversationId);

    if (!conversation) {
      return false;
    }

    conversation.metadata = { ...conversation.metadata, ...metadata };
    conversation.updatedAt = Date.now();

    return true;
  }

  /**
   * Delete a conversation
   */
  deleteConversation(conversationId: string): boolean {
    return this.conversations.delete(conversationId);
  }

  /**
   * Clear all conversations
   */
  clearAllConversations(): void {
    this.conversations.clear();
  }

  /**
   * Get conversation messages
   */
  getMessages(conversationId: string): Message[] {
    const conversation = this.conversations.get(conversationId);
    return conversation?.messages || [];
  }

  /**
   * Get last N messages from a conversation
   */
  getLastMessages(conversationId: string, count: number): Message[] {
    const messages = this.getMessages(conversationId);
    return messages.slice(-count);
  }

  /**
   * Truncate messages to fit within context window
   */
  async truncateConversation(
    conversationId: string,
    maxTokens: number,
    countTokens: (text: string) => Promise<number>
  ): Promise<void> {
    const conversation = this.conversations.get(conversationId);

    if (!conversation) {
      return;
    }

    let totalTokens = 0;
    const messagesToKeep: Message[] = [];

    // Process messages in reverse to keep the most recent ones
    for (let i = conversation.messages.length - 1; i >= 0; i--) {
      const message = conversation.messages[i];
      const tokens = await countTokens(message.content || '');

      if (totalTokens + tokens <= maxTokens) {
        messagesToKeep.unshift(message);
        totalTokens += tokens;
      } else {
        break;
      }
    }

    conversation.messages = messagesToKeep;
    conversation.updatedAt = Date.now();
  }

  /**
   * Export conversation to JSON
   */
  exportConversation(conversationId: string): string | null {
    const conversation = this.conversations.get(conversationId);

    if (!conversation) {
      return null;
    }

    return JSON.stringify(conversation, null, 2);
  }

  /**
   * Import conversation from JSON
   */
  importConversation(json: string): ConversationContext | null {
    try {
      const conversation = JSON.parse(json) as ConversationContext;

      if (!conversation.conversationId || !Array.isArray(conversation.messages)) {
        return null;
      }

      this.conversations.set(conversation.conversationId, conversation);
      return conversation;
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate a unique conversation ID
   */
  private generateId(): string {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get conversation statistics
   */
  getConversationStats(conversationId: string): {
    messageCount: number;
    userMessageCount: number;
    assistantMessageCount: number;
    systemMessageCount: number;
    createdAt: number;
    updatedAt: number;
  } | null {
    const conversation = this.conversations.get(conversationId);

    if (!conversation) {
      return null;
    }

    return {
      messageCount: conversation.messages.length,
      userMessageCount: conversation.messages.filter((m) => m.role === 'user').length,
      assistantMessageCount: conversation.messages.filter((m) => m.role === 'assistant').length,
      systemMessageCount: conversation.messages.filter((m) => m.role === 'system').length,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    };
  }
}

export const conversationManager = new ConversationManager();
