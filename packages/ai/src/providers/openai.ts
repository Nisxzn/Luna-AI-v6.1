/**
 * OpenAI Provider Implementation
 */

import { BaseProvider } from './base';
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  ModelInfo,
  StreamCallback,
  ProviderType,
} from '../types';

export class OpenAIProvider extends BaseProvider {
  private readonly baseURL = 'https://api.openai.com/v1';

  constructor() {
    super('openai');
    this.initializeModels();
  }

  private initializeModels(): void {
    const models: ModelInfo[] = [
      {
        id: 'gpt-4o',
        name: 'GPT-4 Omni',
        provider: 'openai',
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
        id: 'gpt-4o-mini',
        name: 'GPT-4 Omni Mini',
        provider: 'openai',
        capabilities: {
          supportsStreaming: true,
          supportsFunctionCalling: true,
          supportsVision: true,
          supportsTools: true,
          maxContextTokens: 128000,
          maxOutputTokens: 16384,
          inputCostPer1kTokens: 0.00015,
          outputCostPer1kTokens: 0.0006,
        },
        contextWindow: 128000,
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: 'openai',
        capabilities: {
          supportsStreaming: true,
          supportsFunctionCalling: true,
          supportsVision: true,
          supportsTools: true,
          maxContextTokens: 128000,
          maxOutputTokens: 4096,
          inputCostPer1kTokens: 0.01,
          outputCostPer1kTokens: 0.03,
        },
        contextWindow: 128000,
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: 'openai',
        capabilities: {
          supportsStreaming: true,
          supportsFunctionCalling: true,
          supportsVision: false,
          supportsTools: true,
          maxContextTokens: 16385,
          maxOutputTokens: 4096,
          inputCostPer1kTokens: 0.0005,
          outputCostPer1kTokens: 0.0015,
        },
        contextWindow: 16385,
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
      Authorization: `Bearer ${this.config.apiKey}`,
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
    // OpenAI uses tiktoken for accurate token counting
    // For now, use a more accurate approximation for GPT models
    // Roughly: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }
}
