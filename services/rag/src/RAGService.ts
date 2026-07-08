import {
  RAGService as IRAGService,
  RAGConfig,
  RAGContext,
  RetrievalConfig,
  IndexingStatus,
} from '@luna-ai/types';
import { DocumentManager } from './document-manager';
import { ChunkingEngine } from './chunking';
import { EmbeddingServiceFactory } from './embeddings';
import { VectorStoreFactory } from './vector-store';
import { Retriever } from './retrieval';
import { Reranker } from './reranking';
import { ContextAssembler } from './context';
import { IndexManager } from './indexing';
import { QdrantVectorStore } from './vector-store/QdrantVectorStore';

export class RAGService implements IRAGService {
  private documentManager: DocumentManager;
  private chunkingEngine: ChunkingEngine;
  private embeddingService: any;
  private vectorStore: any;
  private retriever: Retriever;
  private reranker: Reranker;
  private contextAssembler: ContextAssembler;
  private indexManager: IndexManager;
  private config: RAGConfig;
  private initialized: boolean = false;

  private constructor(config: RAGConfig) {
    this.config = config;

    this.documentManager = new DocumentManager();
    this.chunkingEngine = new ChunkingEngine();
    this.embeddingService = EmbeddingServiceFactory.create(config.embedding);
    this.vectorStore = VectorStoreFactory.create(config.vectorStore);
    this.retriever = new Retriever(this.embeddingService, this.vectorStore);
    this.reranker = new Reranker();
    this.contextAssembler = new ContextAssembler();
    this.indexManager = new IndexManager(
      this.documentManager,
      this.chunkingEngine,
      this.embeddingService,
      this.vectorStore,
      config.chunking,
      config.embeddingCacheEnabled
    );
  }

  static async create(config: RAGConfig): Promise<RAGService> {
    const service = new RAGService(config);
    await service.vectorStore.initialize();
    service.initialized = true;
    return service;
  }

  async initialize(config: RAGConfig): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.config = config;
    await this.vectorStore.initialize();
    this.initialized = true;
  }

  async retrieve(query: string, config?: Partial<RetrievalConfig>): Promise<RAGContext> {
    if (!this.initialized) {
      throw new Error('RAG Service is not initialized');
    }

    const retrievalConfig: RetrievalConfig = {
      ...this.config.retrieval,
      ...config,
    };

    const retrievalResults = await this.retriever.retrieve(query, retrievalConfig);

    if (retrievalConfig.rerank) {
      const rerankedResults = await this.reranker.rerank(retrievalResults, query);
      return await this.contextAssembler.assemble(query, rerankedResults);
    }

    return await this.contextAssembler.assemble(query, retrievalResults);
  }

  async indexFile(filePath: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('RAG Service is not initialized');
    }

    const document = await this.documentManager.ingestFile(filePath);
    const chunks = await this.chunkingEngine.chunk(document, this.config.chunking);

    for (const chunk of chunks) {
      chunk.embedding = await this.embeddingService.embed(chunk.content);
    }

    await this.vectorStore.addDocuments(chunks);

    if (this.vectorStore instanceof QdrantVectorStore) {
      this.vectorStore.registerDocument(document);
    }
  }

  async indexDirectory(directoryPath: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('RAG Service is not initialized');
    }

    await this.indexManager.startIndexing(directoryPath);
  }

  async removeDocument(documentId: string): Promise<void> {
    if (!this.initialized) {
      throw new Error('RAG Service is not initialized');
    }

    await this.documentManager.deleteDocument(documentId);
    await this.vectorStore.deleteDocument(documentId);
  }

  getIndexingStatus(): IndexingStatus {
    return this.indexManager.getStatus();
  }

  async shutdown(): Promise<void> {
    if (this.indexManager.getStatus().isIndexing) {
      await this.indexManager.stopIndexing();
    }

    if (this.config.embeddingCacheEnabled) {
      this.indexManager.clearCache();
    }

    this.initialized = false;
  }

  getDocumentManager(): DocumentManager {
    return this.documentManager;
  }

  getVectorStore(): any {
    return this.vectorStore;
  }
}
