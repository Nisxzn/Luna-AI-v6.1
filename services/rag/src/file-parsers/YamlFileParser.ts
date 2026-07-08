import { FileParser } from './FileParser';
import { FileType } from '@luna-ai/types';
import * as fs from 'fs-extra';

export class YamlFileParser extends FileParser {
  supports(fileType: FileType): boolean {
    return fileType === '.yaml' || fileType === '.yml';
  }

  async parse(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8');
  }
}
