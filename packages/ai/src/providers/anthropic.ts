/**
 * Anthropic Provider Implementation
 */

import { BaseProvider } from './base';
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  ModelInfo,
  StreamCallback,
} from '../types';

export class AnthropicProvider extends BaseProvider {
  private readonly baseURL = 'https://api.anthropic.com/v1';

  constructor() {
    super('anthropic');
    this.initializeModels();
  }

  private initializeModels(): void {
    const models: ModelInfo[] = [
      {
        id: 'claude-3-5-sonnet-20241022',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
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
        id: 'claude-3-5-haiku-20241022',
        name: 'Claude 3.5 Haiku',
        provider: 'anthropic',
        capabilities: {
          supportsStreaming: true,
          supportsFunctionCalling: true,
          supportsVision: true,
          supportsTools: true,
          maxContextTokens: 200000,
          maxOutputTokens: 8192,
          inputCostPer1kTokens: 0.0008,
          outputCostPer1kTokens: 0.001,
        },
        contextWindow: 200000,
      },
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        provider: 'anthropic',
        capabilities: {
          supportsStreaming: true,
          supportsFunctionCalling: true,
          supportsVision: true,
          supportsTools: true,
          maxContextTokens: 200000,
          maxOutputTokens: 4096,
          inputCostPer1kTokens: 0.015,
          outputCostPer1kTokens: 0.075,
        },
        contextWindow: 200000,
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        provider: 'anthropic',
        capabilities: {
          supportsStreaming: true,
          supportsFunctionCalling: true,
          supportsVision: true,
          supportsTools: true,
          maxContextTokens: 200000,
          maxOutputTokens: 4096,
          inputCostPer1kTokens: 0.003,
          outputCostPer1kTokens: 0.015,
        },
        contextWindow: 200000,
      },
    ];

    models.forEach((model) => this.models.set(model.id, model));
  }

  async getModels(): Promise<ModelInfo[]> {
    return Array.from(this.models.values());
  }

  async getModel(modelId: string): Promise<ModelInfo | null> {
    return this.models.get(modelId) || null;
  }

  protected getHeaders(): Record<string, string> {
    return {
      ...super.getHeaders(),
      'x-api-key': this.config.apiKey || '',
      'anthropic-version': '2023-06-01',
    };
  }

  transformRequest(request: ChatCompletionRequest): unknown {
    // Anthropic uses a different message format
    const systemMessage = request.messages.find((m) => m.role === 'system');
    const messages = request.messages.filter((m) => m.role !== 'system');

    return {
      model: request.model,
      messages: messages.map((msg) => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      })),
      system: systemMessage?.content || '',
      max_tokens: request.maxTokens || 4096,
      temperature: request.temperature,
      top_p: request.topP,
      stop_sequences: request.stopSequences,
      stream: request.stream || false,
    };
  }

  transformResponse(response: unknown): ChatCompletionResponse {
    const data = response as any;
    return {
      id: data.id,
      model: data.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: data.content[0]?.text || '',
            metadata: {},
          },
          finishReason: data.stop_reason,
        },
      ],
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
      created: Date.now(),
    };
  }

  transformChunk(chunk: unknown): ChatCompletionChunk {
    const data = chunk as any;
    const delta = data.delta || {};
    return {
      id: data.id,
      model: data.model,
      choices: [
        {
          index: 0,
          delta: {
            role: delta.type === 'message_start' ? 'assistant' : undefined,
            content: delta.type === 'content_block_delta' ? delta.delta?.text : undefined,
          },
          finishReason: data.type === 'message_stop' ? 'stop' : null,
        },
      ],
      usage: data.usage
        ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens: data.usage.input_tokens + data.usage.output_tokens,
          }
        : undefined,
      created: Date.now(),
    };
  }

  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    this.validateRequest(request);

    const transformedRequest = this.transformRequest(request);
    const url = `${this.config.baseURL || this.baseURL}/messages`;

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
    const url = `${this.config.baseURL || this.baseURL}/messages`;

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
          if (trimmed === '' || trimmed === 'event: message_stop') {
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
    // Anthropic uses a different tokenization
    // Approximation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
