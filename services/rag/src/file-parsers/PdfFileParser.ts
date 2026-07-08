import { FileParser } from './FileParser';
import { FileType } from '@luna-ai/types';
import * as fs from 'fs-extra';
import pdfParse from 'pdf-parse';

export class PdfFileParser extends FileParser {
  supports(fileType: FileType): boolean {
    return fileType === '.pdf';
  }

  async parse(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }
}
