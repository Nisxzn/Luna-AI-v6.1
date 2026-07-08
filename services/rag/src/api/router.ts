import express, { Request, Response, Router } from 'express';
import { RAGService } from '../RAGService';
import { RAGConfig, RetrievalConfig } from '@luna-ai/types';

export function createRAGRouter(ragService: RAGService): Router {
  const router = express.Router();

  router.post('/retrieve', async (req: Request, res: Response) => {
    try {
      const { query, config } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      const context = await ragService.retrieve(query, config);
      res.json(context);
    } catch (error) {
      console.error('Error in retrieve endpoint:', error);
      res.status(500).json({ error: 'Failed to retrieve context' });
    }
  });

  router.post('/index/file', async (req: Request, res: Response) => {
    try {
      const { filePath } = req.body;

      if (!filePath) {
        return res.status(400).json({ error: 'File path is required' });
      }

      await ragService.indexFile(filePath);
      res.json({ success: true, message: 'File indexed successfully' });
    } catch (error) {
      console.error('Error in index/file endpoint:', error);
      res.status(500).json({ error: 'Failed to index file' });
    }
  });

  router.post('/index/directory', async (req: Request, res: Response) => {
    try {
      const { directoryPath } = req.body;

      if (!directoryPath) {
        return res.status(400).json({ error: 'Directory path is required' });
      }

      await ragService.indexDirectory(directoryPath);
      res.json({ success: true, message: 'Directory indexing started' });
    } catch (error) {
      console.error('Error in index/directory endpoint:', error);
      res.status(500).json({ error: 'Failed to index directory' });
    }
  });

  router.delete('/document/:documentId', async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;

      if (Array.isArray(documentId)) {
        return res.status(400).json({ error: 'Invalid document ID' });
      }

      await ragService.removeDocument(documentId);
      res.json({ success: true, message: 'Document removed successfully' });
    } catch (error) {
      console.error('Error in delete document endpoint:', error);
      res.status(500).json({ error: 'Failed to remove document' });
    }
  });

  router.get('/indexing/status', (req: Request, res: Response) => {
    try {
      const status = ragService.getIndexingStatus();
      res.json(status);
    } catch (error) {
      console.error('Error in indexing status endpoint:', error);
      res.status(500).json({ error: 'Failed to get indexing status' });
    }
  });

  router.post('/indexing/stop', async (req: Request, res: Response) => {
    try {
      const indexManager = (ragService as any).indexManager;
      await indexManager.stopIndexing();
      res.json({ success: true, message: 'Indexing stopped' });
    } catch (error) {
      console.error('Error in stop indexing endpoint:', error);
      res.status(500).json({ error: 'Failed to stop indexing' });
    }
  });

  router.get('/documents', async (req: Request, res: Response) => {
    try {
      const documentManager = ragService.getDocumentManager();
      const documents = await documentManager.listDocuments();
      res.json(documents);
    } catch (error) {
      console.error('Error in documents endpoint:', error);
      res.status(500).json({ error: 'Failed to list documents' });
    }
  });

  router.get('/documents/:documentId', async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;

      if (Array.isArray(documentId)) {
        return res.status(400).json({ error: 'Invalid document ID' });
      }

      const documentManager = ragService.getDocumentManager();
      const document = await documentManager.getDocument(documentId);

      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }

      res.json(document);
    } catch (error) {
      console.error('Error in get document endpoint:', error);
      res.status(500).json({ error: 'Failed to get document' });
    }
  });

  router.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'healthy', service: 'RAG' });
  });

  return router;
}
