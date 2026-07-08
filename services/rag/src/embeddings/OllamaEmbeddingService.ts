import { EmbeddingService } from './EmbeddingService';
import { EmbeddingConfig } from '@luna-ai/types';
import { OllamaEmbeddings } from '@langchain/ollama';

export class OllamaEmbeddingService extends EmbeddingService {
  private embeddings: OllamaEmbeddings;

  constructor(config: EmbeddingConfig) {
    super(config);

    this.embeddings = new OllamaEmbeddings({
      model: config.model || 'nomic-embed-text',
      baseUrl: config.baseURL || 'http://localhost:11434',
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
    return this.config.dimensions || 768;
  }
}
