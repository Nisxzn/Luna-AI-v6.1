/**
 * Ollama Provider Implementation
 */

import { BaseProvider } from './base';
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  ModelInfo,
  StreamCallback,
} from '../types';

export class OllamaProvider extends BaseProvider {
  private readonly baseURL = 'http://localhost:11434/api';

  constructor() {
    super('ollama');
    this.initializeModels();
  }

  private initializeModels(): void {
    // Ollama models are dynamic, so we'll fetch them at runtime
    // These are common default models
    const models: ModelInfo[] = [
      {
        id: 'llama3',
        name: 'Llama 3',
        provider: 'ollama',
        capabilities: {
          supportsStreaming: true,
          supportsFunctionCalling: false,
          supportsVision: false,
          supportsTools: false,
          maxContextTokens: 8192,
          maxOutputTokens: 4096,
          inputCostPer1kTokens: 0,
          outputCostPer1kTokens: 0,
        },
        contextWindow: 8192,
      },
      {
        id: 'mistral',
        name: 'Mistral',
        provider: 'ollama',
        capabilities: {
          supportsStreaming: true,
          supportsFunctionCalling: false,
          supportsVision: false,
          supportsTools: false,
          maxContextTokens: 8192,
          maxOutputTokens: 4096,
          inputCostPer1kTokens: 0,
          outputCostPer1kTokens: 0,
        },
        contextWindow: 8192,
      },
      {
        id: 'codellama',
        name: 'Code Llama',
        provider: 'ollama',
        capabilities: {
          supportsStreaming: true,
          supportsFunctionCalling: false,
          supportsVision: false,
          supportsTools: false,
          maxContextTokens: 16384,
          maxOutputTokens: 4096,
          inputCostPer1kTokens: 0,
          outputCostPer1kTokens: 0,
        },
        contextWindow: 16384,
      },
    ];

    models.forEach((model) => this.models.set(model.id, model));
  }

  async getModels(): Promise<ModelInfo[]> {
    try {
      const url = `${this.config.baseURL || this.baseURL}/tags`;
      const response = await this.fetchWithRetry(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json() as any;
      const ollamaModels: ModelInfo[] = data.models?.map((model: any) => ({
        id: model.name,
        name: model.name,
        provider: 'ollama',
        capabilities: {
          supportsStreaming: true,
          supportsFunctionCalling: false,
          supportsVision: false,
          supportsTools: false,
          maxContextTokens: 8192,
          maxOutputTokens: 4096,
          inputCostPer1kTokens: 0,
          outputCostPer1kTokens: 0,
        },
        contextWindow: 8192,
      })) || [];

      // Update our models map
      ollamaModels.forEach((model) => this.models.set(model.id, model));

      return ollamaModels;
    } catch (error) {
      // Return default models if Ollama is not available
      return Array.from(this.models.values());
    }
  }

  async getModel(modelId: string): Promise<ModelInfo | null> {
    // Try to fetch fresh models first
    await this.getModels();
    return this.models.get(modelId) || null;
  }

  protected getHeaders(): Record<string, string> {
    return {
      ...super.getHeaders(),
    };
  }

  transformRequest(request: ChatCompletionRequest): unknown {
    return {
      model: request.model,
      messages: request.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      options: {
        temperature: request.temperature,
        num_predict: request.maxTokens,
        top_p: request.topP,
        stop: request.stopSequences,
      },
      stream: request.stream || false,
    };
  }

  transformResponse(response: unknown): ChatCompletionResponse {
    const data = response as any;
    return {
      id: `ollama-${Date.now()}`,
      model: data.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: data.message?.content || '',
            metadata: {},
          },
          finishReason: data.done ? 'stop' : null,
        },
      ],
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
      created: Date.now(),
    };
  }

  transformChunk(chunk: unknown): ChatCompletionChunk {
    const data = chunk as any;
    return {
      id: `ollama-${Date.now()}`,
      model: data.model,
      choices: [
        {
          index: 0,
          delta: {
            role: data.message?.role,
            content: data.message?.content,
          },
          finishReason: data.done ? 'stop' : null,
        },
      ],
      usage: data.eval_count
        ? {
            promptTokens: data.prompt_eval_count || 0,
            completionTokens: data.eval_count,
            totalTokens: (data.prompt_eval_count || 0) + data.eval_count,
          }
        : undefined,
      created: Date.now(),
    };
  }

  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    this.validateRequest(request);

    const transformedRequest = this.transformRequest(request);
    const url = `${this.config.baseURL || this.baseURL}/chat`;

    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(transformedRequest),
    });

    const data = await response.json();
    return this.transformResponse(data);
  }

  async streamChatCompletion(
    request: ChatCompletionRequest,
    callback: StreamCallback
  ): Promise<void> {
    this.validateRequest(request);

    const baseRequest = this.transformRequest(request);
    const transformedRequest = { ...(baseRequest as any), stream: true };
    const url = `${this.config.baseURL || this.baseURL}/chat`;

    try {
      const response = await this.fetchWithRetry(url, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(transformedRequest),
      });

      if (!response.body) {
        throw this.createError('Response body is null', 'NO_RESPONSE_BODY');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          callback({ type: 'done' });
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        try {
          const data = JSON.parse(chunk);
          const transformedChunk = this.transformChunk(data);
          callback({ type: 'data', data: transformedChunk });

          if (data.done) {
            callback({ type: 'done' });
            break;
          }
        } catch (error) {
          callback({ type: 'error', error: error as Error });
        }
      }
    } catch (error) {
      callback({ type: 'error', error: error as Error });
    }
  }

  async countTokens(text: string, model?: string): Promise<number> {
    // Ollama uses a different tokenization
    // Approximation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
