import { EmbeddingService } from './EmbeddingService';
import { EmbeddingConfig } from '@luna-ai/types';
import { OpenAIEmbeddings } from '@langchain/openai';

export class OpenAIEmbeddingService extends EmbeddingService {
  private embeddings: OpenAIEmbeddings;

  constructor(config: EmbeddingConfig) {
    super(config);
    this.validateConfig();

    this.embeddings = new OpenAIEmbeddings({
      openAIApiKey: config.apiKey,
      modelName: config.model || 'text-embedding-3-small',
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
    const model = this.config.model || 'text-embedding-3-small';
    if (model === 'text-embedding-3-small') return 1536;
    if (model === 'text-embedding-3-large') return 3072;
    if (model === 'text-embedding-ada-002') return 1536;
    return this.config.dimensions || 1536;
  }
}
