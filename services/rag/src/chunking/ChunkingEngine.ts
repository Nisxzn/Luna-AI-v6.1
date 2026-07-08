import {
  ChunkingEngine as IChunkingEngine,
  Document,
  DocumentChunk,
  ChunkingConfig,
  ChunkMetadata,
  FileType,
} from '@luna-ai/types';
import { v4 as uuidv4 } from 'uuid';

export class ChunkingEngine implements IChunkingEngine {
  async chunk(document: Document, config: ChunkingConfig): Promise<DocumentChunk[]> {
    switch (config.strategy) {
      case 'semantic':
        return this.semanticChunking(document, config);
      case 'code-aware':
        return this.codeAwareChunking(document, config);
      case 'markdown-aware':
        return this.markdownAwareChunking(document, config);
      case 'fixed-size':
      default:
        return this.fixedSizeChunking(document, config);
    }
  }

  private fixedSizeChunking(document: Document, config: ChunkingConfig): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const { content } = document;
    const { chunkSize, overlap } = config;

    let startIndex = 0;
    let chunkIndex = 0;

    while (startIndex < content.length) {
      const endIndex = Math.min(startIndex + chunkSize, content.length);
      const chunkContent = content.slice(startIndex, endIndex);

      const chunk: DocumentChunk = {
        id: uuidv4(),
        documentId: document.id,
        content: chunkContent,
        metadata: this.createChunkMetadata(
          chunkIndex,
          startIndex,
          endIndex,
          chunkContent,
          config,
          document
        ),
      };

      chunks.push(chunk);
      chunkIndex++;

      startIndex += chunkSize - overlap;
    }

    return chunks;
  }

  private semanticChunking(document: Document, config: ChunkingConfig): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const { content } = document;
    const { chunkSize, overlap } = config;

    const sentences = this.splitIntoSentences(content);
    let currentChunk = '';
    let startIndex = 0;
    let chunkIndex = 0;

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
        const chunk: DocumentChunk = {
          id: uuidv4(),
          documentId: document.id,
          content: currentChunk.trim(),
          metadata: this.createChunkMetadata(
            chunkIndex,
            startIndex,
            startIndex + currentChunk.length,
            currentChunk,
            config,
            document
          ),
        };

        chunks.push(chunk);
        chunkIndex++;

        const overlapText = this.getOverlapText(currentChunk, overlap);
        currentChunk = overlapText + sentence;
        startIndex += currentChunk.length - overlapText.length;
      } else {
        if (currentChunk.length === 0) {
          startIndex = content.indexOf(sentence, startIndex);
        }
        currentChunk += sentence;
      }
    }

    if (currentChunk.trim().length > 0) {
      const chunk: DocumentChunk = {
        id: uuidv4(),
        documentId: document.id,
        content: currentChunk.trim(),
        metadata: this.createChunkMetadata(
          chunkIndex,
          startIndex,
          startIndex + currentChunk.length,
          currentChunk,
          config,
          document
        ),
      };

      chunks.push(chunk);
    }

    return chunks;
  }

  private codeAwareChunking(document: Document, config: ChunkingConfig): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const { content } = document;
    const { chunkSize, overlap } = config;

    const codeBlocks = this.splitIntoCodeBlocks(content);
    let startIndex = 0;
    let chunkIndex = 0;

    for (const block of codeBlocks) {
      if (block.length <= chunkSize) {
        const chunk: DocumentChunk = {
          id: uuidv4(),
          documentId: document.id,
          content: block,
          metadata: this.createChunkMetadata(
            chunkIndex,
            startIndex,
            startIndex + block.length,
            block,
            config,
            document
          ),
        };

        chunks.push(chunk);
        chunkIndex++;
        startIndex += block.length;
      } else {
        const subChunks = this.fixedSizeChunking(
          { ...document, content: block },
          config
        );

        for (const subChunk of subChunks) {
          chunks.push({
            ...subChunk,
            metadata: {
              ...subChunk.metadata,
              startIndex: startIndex + subChunk.metadata.startIndex,
              endIndex: startIndex + subChunk.metadata.endIndex,
            },
          });
          chunkIndex++;
        }

        startIndex += block.length;
      }
    }

    return chunks;
  }

  private markdownAwareChunking(document: Document, config: ChunkingConfig): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const { content } = document;
    const { chunkSize, overlap } = config;

    const sections = this.splitIntoMarkdownSections(content);
    let startIndex = 0;
    let chunkIndex = 0;

    for (const section of sections) {
      if (section.length <= chunkSize) {
        const chunk: DocumentChunk = {
          id: uuidv4(),
          documentId: document.id,
          content: section,
          metadata: this.createChunkMetadata(
            chunkIndex,
            startIndex,
            startIndex + section.length,
            section,
            config,
            document
          ),
        };

        chunks.push(chunk);
        chunkIndex++;
        startIndex += section.length;
      } else {
        const subChunks = this.fixedSizeChunking(
          { ...document, content: section },
          config
        );

        for (const subChunk of subChunks) {
          chunks.push({
            ...subChunk,
            metadata: {
              ...subChunk.metadata,
              startIndex: startIndex + subChunk.metadata.startIndex,
              endIndex: startIndex + subChunk.metadata.endIndex,
            },
          });
          chunkIndex++;
        }

        startIndex += section.length;
      }
    }

    return chunks;
  }

  private splitIntoSentences(text: string): string[] {
    const sentenceRegex = /[.!?]+(\s|$)/g;
    const sentences: string[] = [];
    let match;
    let lastIndex = 0;

    while ((match = sentenceRegex.exec(text)) !== null) {
      sentences.push(text.slice(lastIndex, match.index + match[0].length));
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      sentences.push(text.slice(lastIndex));
    }

    return sentences;
  }

  private splitIntoCodeBlocks(text: string): string[] {
    const blocks: string[] = [];
    const lines = text.split('\n');
    let currentBlock = '';
    let inBlock = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('function') || trimmed.startsWith('class') || trimmed.startsWith('const') || trimmed.startsWith('let') || trimmed.startsWith('var') || trimmed.startsWith('interface') || trimmed.startsWith('type') || trimmed.startsWith('export')) {
        if (currentBlock.trim().length > 0) {
          blocks.push(currentBlock);
        }
        currentBlock = line + '\n';
        inBlock = true;
      } else if (inBlock) {
        currentBlock += line + '\n';
        if (trimmed === '}' || trimmed === ');') {
          blocks.push(currentBlock);
          currentBlock = '';
          inBlock = false;
        }
      } else {
        if (currentBlock.trim().length > 0) {
          blocks.push(currentBlock);
        }
        currentBlock = line + '\n';
      }
    }

    if (currentBlock.trim().length > 0) {
      blocks.push(currentBlock);
    }

    return blocks;
  }

  private splitIntoMarkdownSections(text: string): string[] {
    const sections: string[] = [];
    const lines = text.split('\n');
    let currentSection = '';

    for (const line of lines) {
      if (line.startsWith('#')) {
        if (currentSection.trim().length > 0) {
          sections.push(currentSection.trim());
        }
        currentSection = line + '\n';
      } else {
        currentSection += line + '\n';
      }
    }

    if (currentSection.trim().length > 0) {
      sections.push(currentSection.trim());
    }

    return sections;
  }

  private getOverlapText(text: string, overlap: number): string {
    if (overlap >= text.length) {
      return text;
    }
    return text.slice(-overlap);
  }

  private createChunkMetadata(
    chunkIndex: number,
    startIndex: number,
    endIndex: number,
    content: string,
    config: ChunkingConfig,
    document: Document
  ): ChunkMetadata {
    const tokenCount = this.estimateTokenCount(content);

    return {
      chunkIndex,
      startIndex,
      endIndex,
      tokenCount,
      chunkingStrategy: config.strategy,
      language: document.metadata.language,
      filePath: document.metadata.filePath,
      fileName: document.metadata.fileName,
      fileType: document.metadata.fileType,
      workspaceId: document.metadata.workspaceId,
    };
  }

  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
