import { VectorStore } from './VectorStore';
import {
  DocumentChunk,
  RetrievalConfig,
  RetrievalResult,
  VectorStoreConfig,
  Document,
} from '@luna-ai/types';
import { QdrantClient } from '@qdrant/js-client-rest';
import { v4 as uuidv4 } from 'uuid';

export class QdrantVectorStore extends VectorStore {
  private client: QdrantClient;
  private collectionName: string;
  private documents: Map<string, Document> = new Map();

  constructor(config: VectorStoreConfig) {
    super(config);
    this.validateConfig();

    this.client = new QdrantClient({
      url: config.url || 'http://localhost:6333',
      apiKey: config.apiKey,
    });

    this.collectionName = config.collectionName || 'luna-ai-documents';
  }

  async initialize(): Promise<void> {
    const collections = await this.client.getCollections();
    const exists = collections.collections.some(
      (c: any) => c.name === this.collectionName
    );

    if (!exists) {
      await this.client.createCollection(this.collectionName, {
        vectors: {
          size: this.config.dimensions || 1536,
          distance: 'Cosine',
        },
      });
    }
  }

  async addDocument(chunk: DocumentChunk): Promise<void> {
    if (!chunk.embedding) {
      throw new Error('Chunk must have an embedding before adding to vector store');
    }

    await this.client.upsert(this.collectionName, {
      points: [
        {
          id: chunk.id,
          vector: chunk.embedding,
          payload: {
            chunk_id: chunk.id,
            document_id: chunk.documentId,
            content: chunk.content,
            metadata: chunk.metadata,
          },
        },
      ],
    });
  }

  async addDocuments(chunks: DocumentChunk[]): Promise<void> {
    const points = chunks
      .filter((chunk) => chunk.embedding)
      .map((chunk) => ({
        id: chunk.id,
        vector: chunk.embedding!,
        payload: {
          chunk_id: chunk.id,
          document_id: chunk.documentId,
          content: chunk.content,
          metadata: chunk.metadata,
        },
      }));

    if (points.length === 0) {
      return;
    }

    await this.client.upsert(this.collectionName, {
      points,
    });
  }

  async search(
    queryEmbedding: number[],
    config: RetrievalConfig
  ): Promise<RetrievalResult[]> {
    const filter = this.buildQdrantFilter(config.filter);

    const results = await this.client.search(this.collectionName, {
      vector: queryEmbedding,
      limit: config.topK,
      score_threshold: config.minScore,
      filter,
      with_payload: true,
    });

    const retrievalResults: RetrievalResult[] = [];

    for (const result of results) {
      if (result.payload) {
        const document = this.documents.get(result.payload.document_id as string);
        
        if (document) {
          retrievalResults.push({
            chunk: {
              id: result.payload.chunk_id as string,
              documentId: result.payload.document_id as string,
              content: result.payload.content as string,
              metadata: result.payload.metadata as any,
            },
            score: result.score,
            document,
          });
        }
      }
    }

    return retrievalResults;
  }

  async deleteDocument(documentId: string): Promise<void> {
    const filter = {
      must: [
        {
          key: 'document_id',
          match: { value: documentId },
        },
      ],
    };

    await this.client.delete(this.collectionName, { filter });
    this.documents.delete(documentId);
  }

  async deleteCollection(): Promise<void> {
    await this.client.deleteCollection(this.collectionName);
    this.documents.clear();
  }

  async getDocumentCount(): Promise<number> {
    const collectionInfo = await this.client.getCollection(this.collectionName);
    return collectionInfo.points_count || 0;
  }

  registerDocument(document: Document): void {
    this.documents.set(document.id, document);
  }

  private buildQdrantFilter(filter?: any): any {
    if (!filter) return undefined;

    const must: any[] = [];

    if (filter.fileType && filter.fileType.length > 0) {
      must.push({
        key: 'metadata.fileType',
        match: { any: filter.fileType },
      });
    }

    if (filter.language && filter.language.length > 0) {
      must.push({
        key: 'metadata.language',
        match: { any: filter.language },
      });
    }

    if (filter.workspaceId) {
      must.push({
        key: 'metadata.workspaceId',
        match: { value: filter.workspaceId },
      });
    }

    if (filter.tags && filter.tags.length > 0) {
      must.push({
        key: 'metadata.tags',
        match: { any: filter.tags },
      });
    }

    if (must.length === 0) return undefined;

    return { must };
  }
}
