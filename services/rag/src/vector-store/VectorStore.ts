import {
  VectorStore as IVectorStore,
  DocumentChunk,
  RetrievalConfig,
  RetrievalResult,
  VectorStoreConfig,
} from '@luna-ai/types';

export abstract class VectorStore implements IVectorStore {
  protected config: VectorStoreConfig;

  constructor(config: VectorStoreConfig) {
    this.config = config;
  }

  abstract initialize(): Promise<void>;
  abstract addDocument(chunk: DocumentChunk): Promise<void>;
  abstract addDocuments(chunks: DocumentChunk[]): Promise<void>;
  abstract search(queryEmbedding: number[], config: RetrievalConfig): Promise<RetrievalResult[]>;
  abstract deleteDocument(documentId: string): Promise<void>;
  abstract deleteCollection(): Promise<void>;
  abstract getDocumentCount(): Promise<number>;

  protected validateConfig(): void {
    if (!this.config.type) {
      throw new Error('Vector store type is required');
    }

    if (this.config.type === 'qdrant' && !this.config.url) {
      throw new Error('URL is required for Qdrant vector store');
    }
  }
}
