import { EmbeddingService } from './EmbeddingService';
import { OpenAIEmbeddingService } from './OpenAIEmbeddingService';
import { GeminiEmbeddingService } from './GeminiEmbeddingService';
import { OllamaEmbeddingService } from './OllamaEmbeddingService';
import { OpenRouterEmbeddingService } from './OpenRouterEmbeddingService';
import { EmbeddingConfig, EmbeddingProvider } from '@luna-ai/types';

export class EmbeddingServiceFactory {
  static create(config: EmbeddingConfig): EmbeddingService {
    switch (config.provider) {
      case 'openai':
        return new OpenAIEmbeddingService(config);
      case 'gemini':
        return new GeminiEmbeddingService(config);
      case 'ollama':
        return new OllamaEmbeddingService(config);
      case 'openrouter':
        return new OpenRouterEmbeddingService(config);
      default:
        throw new Error(`Unsupported embedding provider: ${config.provider}`);
    }
  }
}
