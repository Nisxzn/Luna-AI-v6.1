/**
 * Base provider interface and abstract class
 */

import type {
  ProviderType,
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  ProviderConfig,
  StreamCallback,
  ModelInfo,
  AIError,
} from '../types';

export interface AIProvider {
  /**
   * Get the provider type
   */
  readonly type: ProviderType;

  /**
   * Get available models for this provider
   */
  getModels(): Promise<ModelInfo[]>;

  /**
   * Get a specific model by ID
   */
  getModel(modelId: string): Promise<ModelInfo | null>;

  /**
   * Check if the provider is configured and ready
   */
  isConfigured(): boolean;

  /**
   * Configure the provider
   */
  configure(config: ProviderConfig): void;

  /**
   * Create a chat completion (non-streaming)
   */
  createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;

  /**
   * Create a streaming chat completion
   */
  streamChatCompletion(
    request: ChatCompletionRequest,
    callback: StreamCallback
  ): Promise<void>;

  /**
   * Count tokens for a given text
   */
  countTokens(text: string, model?: string): Promise<number>;

  /**
   * Validate a request before sending
   */
  validateRequest(request: ChatCompletionRequest): void;

  /**
   * Transform request to provider-specific format
   */
  transformRequest(request: ChatCompletionRequest): unknown;

  /**
   * Transform response from provider format to standard format
   */
  transformResponse(response: unknown): ChatCompletionResponse;

  /**
   * Transform chunk from provider format to standard format
   */
  transformChunk(chunk: unknown): ChatCompletionChunk;
}

export abstract class BaseProvider implements AIProvider {
  protected config: ProviderConfig = {};
  protected models: Map<string, ModelInfo> = new Map();

  constructor(public readonly type: ProviderType) {}

  abstract getModels(): Promise<ModelInfo[]>;
  abstract getModel(modelId: string): Promise<ModelInfo | null>;
  abstract createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  abstract streamChatCompletion(
    request: ChatCompletionRequest,
    callback: StreamCallback
  ): Promise<void>;
  abstract transformRequest(request: ChatCompletionRequest): unknown;
  abstract transformResponse(response: unknown): ChatCompletionResponse;
  abstract transformChunk(chunk: unknown): ChatCompletionChunk;

  isConfigured(): boolean {
    return !!this.config.apiKey;
  }

  configure(config: ProviderConfig): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): ProviderConfig {
    return { ...this.config };
  }

  validateRequest(request: ChatCompletionRequest): void {
    if (!request.messages || request.messages.length === 0) {
      throw new Error('Request must contain at least one message');
    }

    if (!request.model) {
      throw new Error('Request must specify a model');
    }

    if (request.temperature !== undefined && (request.temperature < 0 || request.temperature > 2)) {
      throw new Error('Temperature must be between 0 and 2');
    }

    if (request.maxTokens !== undefined && request.maxTokens < 0) {
      throw new Error('maxTokens must be non-negative');
    }

    if (request.topP !== undefined && (request.topP < 0 || request.topP > 1)) {
      throw new Error('topP must be between 0 and 1');
    }
  }

  async countTokens(text: string, model?: string): Promise<number> {
    // Default implementation: approximate token count (roughly 4 chars per token)
    // Providers should override with their specific tokenizers
    return Math.ceil(text.length / 4);
  }

  protected createError(message: string, code: string, statusCode?: number, details?: unknown): AIError {
    const error = new Error(message) as AIError;
    error.name = 'AIError';
    error.code = code;
    error.provider = this.type;
    error.statusCode = statusCode;
    error.details = details;
    return error;
  }

  protected async fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<Response> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          signal: AbortSignal.timeout(this.config.timeout || 30000),
        });

        if (response.ok) {
          return response;
        }

        // Don't retry on client errors (4xx)
        if (response.status >= 400 && response.status < 500) {
          throw this.createError(
            `Request failed with status ${response.status}`,
            'REQUEST_FAILED',
            response.status
          );
        }

        // Retry on server errors (5xx)
        lastError = this.createError(
          `Request failed with status ${response.status}`,
          'REQUEST_FAILED',
          response.status
        );

        if (attempt < maxRetries) {
          await this.delay(retryDelay * Math.pow(2, attempt));
        }
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          await this.delay(retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError || this.createError('Max retries exceeded', 'MAX_RETRIES_EXCEEDED');
  }

  protected delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      ...this.config.headers,
    };
  }
}
