import { VectorStore } from './VectorStore';
import { QdrantVectorStore } from './QdrantVectorStore';
import { VectorStoreConfig, VectorStoreType } from '@luna-ai/types';

export class VectorStoreFactory {
  static create(config: VectorStoreConfig): VectorStore {
    switch (config.type) {
      case 'qdrant':
        return new QdrantVectorStore(config);
      case 'chroma':
        throw new Error('Chroma vector store is not yet implemented');
      case 'faiss':
        throw new Error('FAISS vector store is not yet implemented');
      default:
        throw new Error(`Unsupported vector store type: ${config.type}`);
    }
  }
}
