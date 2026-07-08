// RAG System Types

export type EmbeddingProvider = 'openai' | 'gemini' | 'ollama' | 'openrouter';

export type VectorStoreType = 'qdrant' | 'chroma' | 'faiss';

export type ChunkingStrategy = 'semantic' | 'code-aware' | 'markdown-aware' | 'fixed-size';

export type FileType = 
  | '.ts' 
  | '.tsx' 
  | '.js' 
  | '.jsx' 
  | '.json' 
  | '.md' 
  | '.txt' 
  | '.pdf' 
  | '.html' 
  | '.css' 
  | '.scss' 
  | '.yaml' 
  | '.yml';

export interface DocumentMetadata {
  id: string;
  filePath: string;
  fileName: string;
  fileType: FileType;
  fileSize: number;
  language?: string;
  createdAt: Date;
  updatedAt: Date;
  indexedAt?: Date;
  checksum: string;
  workspaceId?: string;
  tags?: string[];
  author?: string;
}

export interface Document {
  id: string;
  content: string;
  metadata: DocumentMetadata;
  chunks: DocumentChunk[];
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  metadata: ChunkMetadata;
  embedding?: number[];
}

export interface ChunkMetadata {
  chunkIndex: number;
  startIndex: number;
  endIndex: number;
  tokenCount: number;
  chunkingStrategy: ChunkingStrategy;
  language?: string;
  filePath: string;
  fileName: string;
  fileType: FileType;
  workspaceId?: string;
}

export interface EmbeddingConfig {
  provider: EmbeddingProvider;
  model?: string;
  apiKey?: string;
  baseURL?: string;
  dimensions?: number;
  batchSize?: number;
}

export interface VectorStoreConfig {
  type: VectorStoreType;
  url?: string;
  apiKey?: string;
  collectionName?: string;
  dimensions?: number;
}

export interface ChunkingConfig {
  strategy: ChunkingStrategy;
  chunkSize: number;
  overlap: number;
  maxChunkSize?: number;
  minChunkSize?: number;
}

export interface RetrievalConfig {
  topK: number;
  minScore: number;
  filter?: MetadataFilter;
  hybridSearch?: boolean;
  rerank?: boolean;
  maxContextTokens?: number;
}

export interface MetadataFilter {
  fileType?: FileType[];
  language?: string[];
  workspaceId?: string;
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface RetrievalResult {
  chunk: DocumentChunk;
  score: number;
  document: Document;
}

export interface RAGContext {
  query: string;
  retrievedDocuments: RetrievalResult[];
  workspaceContext?: string;
  memoryContext?: string;
  assembledContext: string;
  tokenCount: number;
  metadata: {
    retrievalTime: number;
    totalDocuments: number;
    averageScore: number;
  };
}

export interface IndexingStatus {
  isIndexing: boolean;
  progress: number;
  totalFiles: number;
  indexedFiles: number;
  failedFiles: number;
  currentFile?: string;
  startTime?: Date;
  estimatedTimeRemaining?: number;
}

export interface RAGConfig {
  embedding: EmbeddingConfig;
  vectorStore: VectorStoreConfig;
  chunking: ChunkingConfig;
  retrieval: RetrievalConfig;
  enableIncrementalIndexing: boolean;
  enableBackgroundIndexing: boolean;
  embeddingCacheEnabled: boolean;
  maxConcurrentIndexing: number;
}

export interface EmbeddingService {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  getDimensions(): number;
}

export interface VectorStore {
  initialize(): Promise<void>;
  addDocument(chunk: DocumentChunk): Promise<void>;
  addDocuments(chunks: DocumentChunk[]): Promise<void>;
  search(queryEmbedding: number[], config: RetrievalConfig): Promise<RetrievalResult[]>;
  deleteDocument(documentId: string): Promise<void>;
  deleteCollection(): Promise<void>;
  getDocumentCount(): Promise<number>;
}

export interface FileParser {
  parse(filePath: string): Promise<string>;
  supports(fileType: FileType): boolean;
  extractMetadata(filePath: string): Promise<Partial<DocumentMetadata>>;
}

export interface ChunkingEngine {
  chunk(document: Document, config: ChunkingConfig): Promise<DocumentChunk[]>;
}

export interface Retriever {
  retrieve(query: string, config: RetrievalConfig): Promise<RetrievalResult[]>;
}

export interface Reranker {
  rerank(results: RetrievalResult[], query: string): Promise<RetrievalResult[]>;
}

export interface ContextAssembler {
  assemble(
    query: string,
    retrievalResults: RetrievalResult[],
    workspaceContext?: string,
    memoryContext?: string
  ): Promise<RAGContext>;
}

export interface DocumentManager {
  ingestFile(filePath: string): Promise<Document>;
  ingestDirectory(directoryPath: string): Promise<Document[]>;
  getDocument(documentId: string): Promise<Document | null>;
  deleteDocument(documentId: string): Promise<void>;
  listDocuments(filter?: MetadataFilter): Promise<Document[]>;
  isDuplicate(filePath: string, checksum: string): Promise<boolean>;
}

export interface IndexManager {
  startIndexing(workspacePath: string): Promise<void>;
  stopIndexing(): Promise<void>;
  getStatus(): IndexingStatus;
  reindexDocument(documentId: string): Promise<void>;
}

export interface RAGService {
  initialize(config: RAGConfig): Promise<void>;
  retrieve(query: string, config?: Partial<RetrievalConfig>): Promise<RAGContext>;
  indexFile(filePath: string): Promise<void>;
  indexDirectory(directoryPath: string): Promise<void>;
  removeDocument(documentId: string): Promise<void>;
  getIndexingStatus(): IndexingStatus;
  shutdown(): Promise<void>;
}
