// Luna AI RAG Service
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { RAGService } from './RAGService';
import { createRAGRouter } from './api';
import { RAGConfig } from '@luna-ai/types';

dotenv.config();

const PORT = process.env.RAG_PORT || 3001;
const app = express();

app.use(cors());
app.use(express.json());

let ragService: RAGService | null = null;

async function initializeRAGService() {
  const config: RAGConfig = {
    embedding: {
      provider: (process.env.EMBEDDING_PROVIDER as any) || 'openai',
      apiKey: process.env.OPENAI_API_KEY || process.env.EMBEDDING_API_KEY,
      model: process.env.EMBEDDING_MODEL,
      baseURL: process.env.EMBEDDING_BASE_URL,
      dimensions: process.env.EMBEDDING_DIMENSIONS ? parseInt(process.env.EMBEDDING_DIMENSIONS) : undefined,
      batchSize: process.env.EMBEDDING_BATCH_SIZE ? parseInt(process.env.EMBEDDING_BATCH_SIZE) : undefined,
    },
    vectorStore: {
      type: (process.env.VECTOR_STORE_TYPE as any) || 'qdrant',
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY,
      collectionName: process.env.QDRANT_COLLECTION_NAME || 'luna-ai-documents',
      dimensions: process.env.VECTOR_STORE_DIMENSIONS ? parseInt(process.env.VECTOR_STORE_DIMENSIONS) : 1536,
    },
    chunking: {
      strategy: (process.env.CHUNKING_STRATEGY as any) || 'semantic',
      chunkSize: process.env.CHUNK_SIZE ? parseInt(process.env.CHUNK_SIZE) : 1000,
      overlap: process.env.CHUNK_OVERLAP ? parseInt(process.env.CHUNK_OVERLAP) : 200,
      maxChunkSize: process.env.MAX_CHUNK_SIZE ? parseInt(process.env.MAX_CHUNK_SIZE) : undefined,
      minChunkSize: process.env.MIN_CHUNK_SIZE ? parseInt(process.env.MIN_CHUNK_SIZE) : undefined,
    },
    retrieval: {
      topK: process.env.RETRIEVAL_TOP_K ? parseInt(process.env.RETRIEVAL_TOP_K) : 5,
      minScore: process.env.RETRIEVAL_MIN_SCORE ? parseFloat(process.env.RETRIEVAL_MIN_SCORE) : 0.7,
      hybridSearch: process.env.HYBRID_SEARCH === 'true',
      rerank: process.env.RERANK === 'true',
      maxContextTokens: process.env.MAX_CONTEXT_TOKENS ? parseInt(process.env.MAX_CONTEXT_TOKENS) : 8000,
    },
    enableIncrementalIndexing: process.env.ENABLE_INCREMENTAL_INDEXING !== 'false',
    enableBackgroundIndexing: process.env.ENABLE_BACKGROUND_INDEXING === 'true',
    embeddingCacheEnabled: process.env.EMBEDDING_CACHE_ENABLED !== 'false',
    maxConcurrentIndexing: process.env.MAX_CONCURRENT_INDEXING ? parseInt(process.env.MAX_CONCURRENT_INDEXING) : 4,
  };

  ragService = await RAGService.create(config);
  console.log('RAG Service initialized successfully');
}

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'RAG API' });
});

async function startServer() {
  try {
    await initializeRAGService();

    if (ragService) {
      app.use('/api/rag', createRAGRouter(ragService));
    }

    app.listen(PORT, () => {
      console.log(`RAG Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start RAG Service:', error);
    process.exit(1);
  }
}

startServer();

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (ragService) {
    await ragService.shutdown();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  if (ragService) {
    await ragService.shutdown();
  }
  process.exit(0);
});
