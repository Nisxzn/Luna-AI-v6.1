import { FileParser } from './FileParser';
import { CodeFileParser } from './CodeFileParser';
import { JsonFileParser } from './JsonFileParser';
import { MarkdownFileParser } from './MarkdownFileParser';
import { TextFileParser } from './TextFileParser';
import { PdfFileParser } from './PdfFileParser';
import { HtmlFileParser } from './HtmlFileParser';
import { YamlFileParser } from './YamlFileParser';
import { FileType } from '@luna-ai/types';

export class FileParserRegistry {
  private parsers: FileParser[] = [
    new CodeFileParser(),
    new JsonFileParser(),
    new MarkdownFileParser(),
    new TextFileParser(),
    new PdfFileParser(),
    new HtmlFileParser(),
    new YamlFileParser(),
  ];

  getParser(fileType: FileType): FileParser | null {
    return this.parsers.find((parser) => parser.supports(fileType)) || null;
  }

  registerParser(parser: FileParser): void {
    this.parsers.push(parser);
  }
}

export const fileParserRegistry = new FileParserRegistry();
