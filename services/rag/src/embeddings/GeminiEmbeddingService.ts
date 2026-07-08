import { EmbeddingService } from './EmbeddingService';
import { EmbeddingConfig } from '@luna-ai/types';
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';

export class GeminiEmbeddingService extends EmbeddingService {
  private embeddings: GoogleGenerativeAIEmbeddings;

  constructor(config: EmbeddingConfig) {
    super(config);
    this.validateConfig();

    this.embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey: config.apiKey,
      model: config.model || 'text-embedding-004',
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
