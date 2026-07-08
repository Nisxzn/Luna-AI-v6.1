/**
 * Google Gemini Provider Implementation
 */

import { BaseProvider } from './base';
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionChunk,
  ModelInfo,
  StreamCallback,
} from '../types';

export class GeminiProvider extends BaseProvider {
  private readonly baseURL = 'https://generativelanguage.googleapis.com/v1beta';

  constructor() {
    super('gemini');
    this.initializeModels();
  }

  private initializeModels(): void {
    const models: ModelInfo[] = [
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'gemini',
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
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'gemini',
        capabilities: {
          supportsStreaming: true,
          supportsFunctionCalling: true,
          supportsVision: true,
          supportsTools: true,
          maxContextTokens: 2800000,
          maxOutputTokens: 8192,
          inputCostPer1kTokens: 0.000075,
          outputCostPer1kTokens: 0.0003,
        },
        contextWindow: 2800000,
      },
      {
        id: 'gemini-1.0-pro',
        name: 'Gemini 1.0 Pro',
        provider: 'gemini',
        capabilities: {
          supportsStreaming: true,
          supportsFunctionCalling: true,
          supportsVision: true,
          supportsTools: true,
          maxContextTokens: 91728,
          maxOutputTokens: 8192,
          inputCostPer1kTokens: 0.0005,
          outputCostPer1kTokens: 0.0015,
        },
        contextWindow: 91728,
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
      'Content-Type': 'application/json',
    };
  }

  transformRequest(request: ChatCompletionRequest): unknown {
    // Gemini uses a different message format
    const systemInstruction = request.messages.find((m) => m.role === 'system');
    const messages = request.messages.filter((m) => m.role !== 'system');

    return {
      contents: messages.map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      })),
      systemInstruction: systemInstruction
        ? {
            parts: [{ text: systemInstruction.content }],
          }
        : undefined,
      generationConfig: {
        temperature: request.temperature,
        maxOutputTokens: request.maxTokens,
        topP: request.topP,
        stopSequences: request.stopSequences,
      },
    };
  }

  transformResponse(response: unknown): ChatCompletionResponse {
    const data = response as any;
    const candidate = data.candidates?.[0];
    const content = candidate?.content?.parts?.[0]?.text || '';

    return {
      id: data.id || `gemini-${Date.now()}`,
      model: data.model || 'gemini-1.5-pro',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content,
            metadata: {},
          },
          finishReason: candidate?.finishReason || 'stop',
        },
      ],
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      },
      created: Date.now(),
    };
  }

  transformChunk(chunk: unknown): ChatCompletionChunk {
    const data = chunk as any;
    const candidate = data.candidates?.[0];
    const delta = candidate?.content?.parts?.[0]?.text || '';

    return {
      id: data.id || `gemini-${Date.now()}`,
      model: data.model || 'gemini-1.5-pro',
      choices: [
        {
          index: 0,
          delta: {
            role: 'assistant',
            content: delta,
          },
          finishReason: candidate?.finishReason || null,
        },
      ],
      usage: data.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount,
            completionTokens: data.usageMetadata.candidatesTokenCount,
            totalTokens: data.usageMetadata.totalTokenCount,
          }
        : undefined,
      created: Date.now(),
    };
  }

  async createChatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    this.validateRequest(request);

    const transformedRequest = this.transformRequest(request);
    const apiKey = this.config.apiKey;
    const url = `${this.config.baseURL || this.baseURL}/models/${request.model}:generateContent?key=${apiKey}`;

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
    const transformedRequest = { ...(baseRequest as any) };
    const apiKey = this.config.apiKey;
    const url = `${this.config.baseURL || this.baseURL}/models/${request.model}:streamGenerateContent?key=${apiKey}`;

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

        // Gemini sends data in a different format
        try {
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') continue;

            const data = JSON.parse(line);
            const chunk = this.transformChunk(data);
            callback({ type: 'data', data: chunk });
          }
        } catch (error) {
          // Continue processing if JSON parsing fails
        }
      }
    } catch (error) {
      callback({ type: 'error', error: error as Error });
    }
  }

  async countTokens(text: string, model?: string): Promise<number> {
    // Gemini uses a different tokenization
    // Approximation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
}
