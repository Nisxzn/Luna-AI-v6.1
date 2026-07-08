/**
 * Chat Service
 * Handles chat completion requests with automatic provider selection
 */

import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  StreamCallback,
} from '../types';
import { providerManager } from '../manager/ProviderManager';
import { contextManager, MemoryContext } from './ContextManager';

export class ChatService {
  /**
   * Create a chat completion (non-streaming)
   */
  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const provider = providerManager.getProviderForModel(request.model);

    if (!provider) {
      throw new Error(`No provider found for model: ${request.model}`);
    }

    if (!provider.isConfigured()) {
      throw new Error(`Provider ${provider.type} is not configured`);
    }

    const requestWithMemory = this.enrichRequestWithMemory(request);
    return await provider.createChatCompletion(requestWithMemory);
  }

  /**
   * Create a streaming chat completion
   */
  async streamChatCompletion(
    request: ChatCompletionRequest,
    callback: StreamCallback
  ): Promise<void> {
    const provider = providerManager.getProviderForModel(request.model);

    if (!provider) {
      throw new Error(`No provider found for model: ${request.model}`);
    }

    if (!provider.isConfigured()) {
      throw new Error(`Provider ${provider.type} is not configured`);
    }

    await provider.streamChatCompletion(request, callback);
  }

  /**
   * Create a chat completion with automatic provider selection
   */
  async createChatCompletionAuto(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const provider = providerManager.autoSelectProvider();

    if (!provider) {
      throw new Error('No configured provider available');
    }

    if (!provider.isConfigured()) {
      throw new Error(`Provider ${provider.type} is not configured`);
    }

    return await provider.createChatCompletion(request);
  }

  /**
   * Stream a chat completion with automatic provider selection
   */
  async streamChatCompletionAuto(
    request: ChatCompletionRequest,
    callback: StreamCallback
  ): Promise<void> {
    const provider = providerManager.autoSelectProvider();

    if (!provider) {
      throw new Error('No configured provider available');
    }

    if (!provider.isConfigured()) {
      throw new Error(`Provider ${provider.type} is not configured`);
    }

    await provider.streamChatCompletion(request, callback);
  }

  /**
   * Count tokens for a request
   */
  async countTokens(request: ChatCompletionRequest): Promise<number> {
    const provider = providerManager.getProviderForModel(request.model);

    if (!provider) {
      // Fallback to simple estimation
      const text = request.messages.map((m) => m.content).join('\n');
      return Math.ceil(text.length / 4);
    }

    const text = request.messages.map((m) => m.content).join('\n');
    return await provider.countTokens(text, request.model);
  }

  /**
   * Estimate cost for a request
   */
  async estimateCost(request: ChatCompletionRequest): Promise<number> {
    const { modelRegistry } = await import('../registry/ModelRegistry');
    const model = modelRegistry.getModel(request.model);

    if (!model) {
      return 0;
    }

    const inputTokens = await this.countTokens(request);
    const outputTokens = request.maxTokens || 1000;

    const inputCost = (inputTokens / 1000) * model.capabilities.inputCostPer1kTokens;
    const outputCost = (outputTokens / 1000) * model.capabilities.outputCostPer1kTokens;

    return inputCost + outputCost;
  }

  /**
   * Enrich request with memory context
   */
  private enrichRequestWithMemory(request: ChatCompletionRequest): ChatCompletionRequest {
    const memoryContext = contextManager.getMemoryContext();
    
    if (!memoryContext || memoryContext.memories.length === 0) {
      return request;
    }

    const enrichedRequest = {
      ...request,
      messages: contextManager.buildContextWithMemory(request.messages, request.model),
    };

    return enrichedRequest;
  }

  /**
   * Set memory context for subsequent requests
   */
  setMemoryContext(memoryContext: MemoryContext): void {
    contextManager.setMemoryContext(memoryContext);
  }

  /**
   * Clear memory context
   */
  clearMemoryContext(): void {
    contextManager.clearMemoryContext();
  }
}

export const chatService = new ChatService();
