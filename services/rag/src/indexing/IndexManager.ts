import {
  IndexManager as IIndexManager,
  IndexingStatus,
  DocumentManager,
  ChunkingEngine,
  EmbeddingService,
  VectorStore,
  ChunkingConfig,
} from '@luna-ai/types';
import * as fs from 'fs-extra';
import * as path from 'path';

export class IndexManager implements IIndexManager {
  private status: IndexingStatus = {
    isIndexing: false,
    progress: 0,
    totalFiles: 0,
    indexedFiles: 0,
    failedFiles: 0,
  };

  private abortController: AbortController | null = null;
  private embeddingCache: Map<string, number[]> = new Map();

  constructor(
    private documentManager: DocumentManager,
    private chunkingEngine: ChunkingEngine,
    private embeddingService: EmbeddingService,
    private vectorStore: VectorStore,
    private chunkingConfig: ChunkingConfig,
    private enableCache: boolean = true
  ) {}

  async startIndexing(workspacePath: string): Promise<void> {
    if (this.status.isIndexing) {
      throw new Error('Indexing is already in progress');
    }

    this.abortController = new AbortController();
    this.status = {
      isIndexing: true,
      progress: 0,
      totalFiles: 0,
      indexedFiles: 0,
      failedFiles: 0,
      startTime: new Date(),
    };

    try {
      const files = await this.getSupportedFiles(workspacePath);
      this.status.totalFiles = files.length;

      for (const file of files) {
        if (this.abortController.signal.aborted) {
          break;
        }

        this.status.currentFile = file;

        try {
          await this.indexFile(file);
          this.status.indexedFiles++;
        } catch (error) {
          console.error(`Failed to index file: ${file}`, error);
          this.status.failedFiles++;
        }

        this.status.progress = (this.status.indexedFiles / this.status.totalFiles) * 100;
      }
    } finally {
      this.status.isIndexing = false;
      this.abortController = null;
    }
  }

  async stopIndexing(): Promise<void> {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  getStatus(): IndexingStatus {
    return { ...this.status };
  }

  async reindexDocument(documentId: string): Promise<void> {
    const document = await this.documentManager.getDocument(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    await this.vectorStore.deleteDocument(documentId);
    await this.processDocument(document);
  }

  private async indexFile(filePath: string): Promise<void> {
    const document = await this.documentManager.ingestFile(filePath);
    await this.processDocument(document);
  }

  private async processDocument(document: any): Promise<void> {
    const chunks = await this.chunkingEngine.chunk(document, this.chunkingConfig);

    for (const chunk of chunks) {
      const embedding = await this.getEmbedding(chunk.content);
      chunk.embedding = embedding;
    }

    await this.vectorStore.addDocuments(chunks);

    if (this.vectorStore instanceof (await import('../vector-store/QdrantVectorStore')).QdrantVectorStore) {
      (this.vectorStore as any).registerDocument(document);
    }
  }

  private async getEmbedding(text: string): Promise<number[]> {
    if (this.enableCache && this.embeddingCache.has(text)) {
      return this.embeddingCache.get(text)!;
    }

    const embedding = await this.embeddingService.embed(text);

    if (this.enableCache) {
      this.embeddingCache.set(text, embedding);
    }

    return embedding;
  }

  private async getSupportedFiles(directoryPath: string): Promise<string[]> {
    const supportedExtensions = [
      '.ts',
      '.tsx',
      '.js',
      '.jsx',
      '.json',
      '.md',
      '.txt',
      '.pdf',
      '.html',
      '.css',
      '.scss',
      '.yaml',
      '.yml',
    ];

    const files: string[] = [];
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directoryPath, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await this.getSupportedFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (supportedExtensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  clearCache(): void {
    this.embeddingCache.clear();
  }
}
