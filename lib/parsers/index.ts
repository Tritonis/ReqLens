import { parsePdf } from './pdf';
import { parseDocx } from './docx';
import { parseXlsx } from './xlsx';

export async function parseFile(buffer: Buffer, ext: string): Promise<string> {
  switch (ext.toLowerCase()) {
    case 'pdf':  return parsePdf(buffer);
    case 'docx':
    case 'doc':  return parseDocx(buffer);
    case 'xlsx':
    case 'xls':  return parseXlsx(buffer);
    default:     return buffer.toString('utf-8');
  }
}
