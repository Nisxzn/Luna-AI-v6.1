import {
  DocumentManager as IDocumentManager,
  Document,
  DocumentMetadata,
  MetadataFilter,
  FileType,
} from '@luna-ai/types';
import { fileParserRegistry } from '../file-parsers';
import * as fs from 'fs-extra';
import * as path from 'path';
import { franc } from 'franc';
import { v4 as uuidv4 } from 'uuid';

export class DocumentManager implements IDocumentManager {
  private documents: Map<string, Document> = new Map();
  private checksums: Map<string, string> = new Map();

  async ingestFile(filePath: string): Promise<Document> {
    const fileType = path.extname(filePath) as FileType;
    const parser = fileParserRegistry.getParser(fileType);

    if (!parser) {
      throw new Error(`No parser found for file type: ${fileType}`);
    }

    const metadata = await parser.extractMetadata(filePath);
    const content = await parser.parse(filePath);

    const language = this.detectLanguage(content);

    const fullMetadata: DocumentMetadata = {
      ...metadata,
      language,
      indexedAt: new Date(),
    } as DocumentMetadata;

    const document: Document = {
      id: fullMetadata.id,
      content,
      metadata: fullMetadata,
      chunks: [],
    };

    this.documents.set(document.id, document);
    this.checksums.set(filePath, fullMetadata.checksum);

    return document;
  }

  async ingestDirectory(directoryPath: string): Promise<Document[]> {
    const documents: Document[] = [];
    const files = await this.getSupportedFiles(directoryPath);

    for (const file of files) {
      try {
        const document = await this.ingestFile(file);
        documents.push(document);
      } catch (error) {
        console.error(`Failed to ingest file: ${file}`, error);
      }
    }

    return documents;
  }

  async getDocument(documentId: string): Promise<Document | null> {
    return this.documents.get(documentId) || null;
  }

  async deleteDocument(documentId: string): Promise<void> {
    const document = this.documents.get(documentId);
    if (document) {
      this.checksums.delete(document.metadata.filePath);
      this.documents.delete(documentId);
    }
  }

  async listDocuments(filter?: MetadataFilter): Promise<Document[]> {
    let documents = Array.from(this.documents.values());

    if (filter) {
      documents = this.applyFilter(documents, filter);
    }

    return documents;
  }

  async isDuplicate(filePath: string, checksum: string): Promise<boolean> {
    const existingChecksum = this.checksums.get(filePath);
    return existingChecksum === checksum;
  }

  private async getSupportedFiles(directoryPath: string): Promise<string[]> {
    const supportedExtensions: FileType[] = [
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
        const ext = path.extname(entry.name) as FileType;
        if (supportedExtensions.includes(ext)) {
          files.push(fullPath);
        }
      }
    }

    return files;
  }

  private detectLanguage(content: string): string | undefined {
    if (content.length < 10) return undefined;
    const languageCode = franc(content);
    if (languageCode === 'und') return undefined;
    return languageCode;
  }

  private applyFilter(documents: Document[], filter: MetadataFilter): Document[] {
    return documents.filter((doc) => {
      if (filter.fileType && !filter.fileType.includes(doc.metadata.fileType)) {
        return false;
      }

      if (filter.language && doc.metadata.language && !filter.language.includes(doc.metadata.language)) {
        return false;
      }

      if (filter.workspaceId && doc.metadata.workspaceId !== filter.workspaceId) {
        return false;
      }

      if (filter.tags && doc.metadata.tags) {
        const hasTag = filter.tags.some((tag) => doc.metadata.tags?.includes(tag));
        if (!hasTag) return false;
      }

      if (filter.dateRange) {
        const updatedAt = doc.metadata.updatedAt;
        if (updatedAt < filter.dateRange.start || updatedAt > filter.dateRange.end) {
          return false;
        }
      }

      return true;
    });
  }
}
