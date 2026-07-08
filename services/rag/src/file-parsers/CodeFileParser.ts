import { FileParser } from './FileParser';
import { FileType } from '@luna-ai/types';
import * as fs from 'fs-extra';

export class CodeFileParser extends FileParser {
  supports(fileType: FileType): boolean {
    return ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss'].includes(fileType);
  }

  async parse(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8');
  }
}
