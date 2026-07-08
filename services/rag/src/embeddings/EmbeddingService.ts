import {
  EmbeddingService as IEmbeddingService,
  EmbeddingConfig,
  EmbeddingProvider,
} from '@luna-ai/types';

export abstract class EmbeddingService implements IEmbeddingService {
  protected config: EmbeddingConfig;

  constructor(config: EmbeddingConfig) {
    this.config = config;
  }

  abstract embed(text: string): Promise<number[]>;
  abstract embedBatch(texts: string[]): Promise<number[][]>;
  abstract getDimensions(): number;

  protected validateConfig(): void {
    if (!this.config.provider) {
      throw new Error('Embedding provider is required');
    }

    if (this.config.provider === 'openai' && !this.config.apiKey) {
      throw new Error('API key is required for OpenAI provider');
    }

    if (this.config.provider === 'gemini' && !this.config.apiKey) {
      throw new Error('API key is required for Gemini provider');
    }
  }
}
