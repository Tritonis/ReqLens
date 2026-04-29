jest.mock('@/lib/parsers/pdf', () => ({ parsePdf: jest.fn().mockResolvedValue('pdf text') }));
jest.mock('@/lib/parsers/docx', () => ({ parseDocx: jest.fn().mockResolvedValue('docx text') }));
jest.mock('@/lib/parsers/xlsx', () => ({ parseXlsx: jest.fn().mockReturnValue('xlsx text') }));

import { parseFile } from '@/lib/parsers/index';

test('routes pdf to parsePdf', async () => {
  expect(await parseFile(Buffer.from(''), 'pdf')).toBe('pdf text');
});
test('routes docx to parseDocx', async () => {
  expect(await parseFile(Buffer.from(''), 'docx')).toBe('docx text');
});
test('routes xlsx to parseXlsx', async () => {
  expect(await parseFile(Buffer.from(''), 'xlsx')).toBe('xlsx text');
});
test('returns utf-8 for txt', async () => {
  expect(await parseFile(Buffer.from('hello'), 'txt')).toBe('hello');
});
