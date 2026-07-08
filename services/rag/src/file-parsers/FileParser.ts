import { FileParser as IFileParser, FileType, DocumentMetadata } from '@luna-ai/types';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as crypto from 'crypto';
import * as mime from 'mime-types';

export abstract class FileParser implements IFileParser {
  abstract parse(filePath: string): Promise<string>;
  abstract supports(fileType: FileType): boolean;

  async extractMetadata(filePath: string): Promise<Partial<DocumentMetadata>> {
    const stats = await fs.stat(filePath);
    const fileName = path.basename(filePath);
    const fileType = path.extname(fileName) as FileType;
    const checksum = await this.calculateChecksum(filePath);

    return {
      id: crypto.randomUUID(),
      filePath,
      fileName,
      fileType,
      fileSize: stats.size,
      createdAt: stats.birthtime,
      updatedAt: stats.mtime,
      checksum,
    };
  }

  protected async calculateChecksum(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  protected getMimeType(filePath: string): string {
    return mime.lookup(filePath) || 'application/octet-stream';
  }
}
