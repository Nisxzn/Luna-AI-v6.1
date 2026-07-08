/**
 * OpenRouter Provider Implementation
 */

import { BaseProvider } from './base';
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  ModelInfo,
  StreamCallback,
} from '../types';

export class OpenRouterProvider extends BaseProvider {
  private readonly baseURL = 'https://openrouter.ai/api/v1';

  constructor() {
    super('openrouter');
    this.initializeModels();
  }

  private initializeModels(): void {
    // OpenRouter provides access to many models
    // These are some popular ones, but the actual list is dynamic
    const models: ModelInfo[] = [
      {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet (via OpenRouter)',
        provider: 'openrouter',
        capabilities: {
          supportsStreaming: true,
          supportsFunctionCalling: true,
          supportsVision: true,
          supportsTools: true,
          maxContextTokens: 200000,
          maxOutputTokens: 8192,
          inputCostPer1kTokens: 0.003,
          outputCostPer1kTokens: 0.015,
        },
        contextWindow: 200000,
      },
      {
        id: 'openai/gpt-4o',
        name: 'GPT-4 Omni (via OpenRouter)',
        provider: 'openrouter',
        capabilities: {
          supportsStreaming: true,
          supportsFunctionCalling: true,
          supportsVision: true,
          supportsTools: true,
          maxContextTokens: 128000,
          maxOutputTokens: 4096,
          inputCostPer1kTokens: 0.005,
          outputCostPer1kTokens: 0.015,
        },
        contextWindow: 128000,
      },
      {
        id: 'google/gemini-pro-1.5',
        name: 'Gemini Pro 1.5 (via OpenRouter)',
        provider: 'openrouter',
        capabilities: {
          supportsStreaming: true,
          supportsFunctionCalling: true,
          supportsVision: true,
          supportsTools: true,
          maxContextTokens: 2800000,
          maxOutputTokens: 8192,
          inputCostPer1kTokens: 0.00125,
          outputCostPer1kTokens: 0.005,
        },
        contextWindow: 2800000,
      },
      {
        id: 'meta-llama/llama-3.1-70b-instruct',
        name: 'Llama 3.1 70B (via OpenRouter)',
        provider: 'openrouter',
        capabilities: {
          supportsStreaming: true,
          supportsFunctionCalling: true,
          supportsVision: false,
          supportsTools: true,
          maxContextTokens: 131072,
          maxOutputTokens: 4096,
          inputCostPer1kTokens: 0.00059,
          outputCostPer1kTokens: 0.00079,
        },
        contextWindow: 131072,
      },
    ];

    models.forEach((model) => this.models.set(model.id, model));
  }

  async getModels(): Promise<ModelInfo[]> {
    try {
      const url = `${this.config.baseURL || this.baseURL}/models`;
      const response = await this.fetchWithRetry(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json() as any;
      const openRouterModels: ModelInfo[] = data.data?.map((model: any) => ({
        id: model.id,
        name: model.name || model.id,
        provider: 'openrouter',
        capabilities: {
          supportsStreaming: true,
          supportsFunctionCalling: true,
          supportsVision: model.architecture?.modality?.includes('image') || false,
          supportsTools: true,
          maxContextTokens: model.context_length || 8192,
          maxOutputTokens: 4096,
          inputCostPer1kTokens: model.pricing?.prompt || 0,
          outputCostPer1kTokens: model.pricing?.completion || 0,
        },
        contextWindow: model.context_length || 8192,
      })) || [];

      // Update our models map
      openRouterModels.forEach((model) => this.models.set(model.id, model));

      return openRouterModels;
    } catch (error) {
      // Return default models if OpenRouter is not available
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
      Authorization: `Bearer ${this.config.apiKey}`,
      'HTTP-Referer': 'http://localhost',
      'X-Title': 'Luna AI',
    };
  }

  transformRequest(request: ChatCompletionRequest): unknown {
    return {
      model: request.model,
      messages: request.messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      top_p: request.topP,
      frequency_penalty: request.frequencyPenalty,
      presence_penalty: request.presencePenalty,
      stop: request.stopSequences,
      stream: request.stream || false,
    };
  }

  transformResponse(response: unknown): ChatCompletionResponse {
    const data = response as any;
    return {
      id: data.id,
      model: data.model,
      choices: data.choices.map((choice: any) => ({
        index: choice.index,
        message: {
          role: choice.message.role,
          content: choice.message.content,
          metadata: {},
        },
        finishReason: choice.finish_reason,
      })),
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
      created: data.created,
    };
  }

  transformChunk(chunk: unknown): ChatCompletionChunk {
    const data = chunk as any;
    const delta = data.choices[0]?.delta || {};
    return {
      id: data.id,
      model: data.model,
      choices: [
        {
          index: data.choices[0]?.index || 0,
          delta: {
            role: delta.role,
            content: delta.content,
          },
          finishReason: data.choices[0]?.finish_reason || null,
        },
      ],
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
      created: data.created,
    };
  }

  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    this.validateRequest(request);

    const transformedRequest = this.transformRequest(request);
    const url = `${this.config.baseURL || this.baseURL}/chat/completions`;

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
    const url = `${this.config.baseURL || this.baseURL}/chat/completions`;

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
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          callback({ type: 'done' });
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed === '' || trimmed === 'data: [DONE]') {
            continue;
          }

          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              const chunk = this.transformChunk(data);
              callback({ type: 'data', data: chunk });
            } catch (error) {
              callback({ type: 'error', error: error as Error });
            }
          }
        }
      }
    } catch (error) {
      callback({ type: 'error', error: error as Error });
    }
  }

  async countTokens(text: string, model?: string): Promise<number> {
    // OpenRouter uses the tokenization of the underlying model
    // Approximation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
