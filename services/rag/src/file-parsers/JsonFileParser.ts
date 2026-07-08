import { FileParser } from './FileParser';
import { FileType } from '@luna-ai/types';
import * as fs from 'fs-extra';

export class JsonFileParser extends FileParser {
  supports(fileType: FileType): boolean {
    return fileType === '.json';
  }

  async parse(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath, 'utf-8');
    try {
      const json = JSON.parse(content);
      return JSON.stringify(json, null, 2);
    } catch {
      return content;
    }
  }
}
