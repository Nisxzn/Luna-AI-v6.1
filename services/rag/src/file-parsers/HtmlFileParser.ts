import { FileParser } from './FileParser';
import { FileType } from '@luna-ai/types';
import * as fs from 'fs-extra';

export class HtmlFileParser extends FileParser {
  supports(fileType: FileType): boolean {
    return fileType === '.html';
  }

  async parse(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8');
  }
}
