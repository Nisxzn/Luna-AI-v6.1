import { EmbeddingService } from './EmbeddingService';
import { EmbeddingConfig } from '@luna-ai/types';
import { OpenAIEmbeddings } from '@langchain/openai';

export class OpenRouterEmbeddingService extends EmbeddingService {
  private embeddings: OpenAIEmbeddings;

  constructor(config: EmbeddingConfig) {
    super(config);
    this.validateConfig();

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: config.apiKey,
      modelName: config.model || 'openai/text-embedding-3-small',
      configuration: {
        baseURL: config.baseURL || 'https://openrouter.ai/api/v1',
      },
      batchSize: config.batchSize || 100,
    });
  }

  async embed(text: string): Promise<number[]> {
    const embedding = await this.embeddings.embedQuery(text);
    return embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const embeddings = await this.embeddings.embedDocuments(texts);
    return embeddings;
  }

  getDimensions(): number {
    return this.config.dimensions || 1536;
  }
}
