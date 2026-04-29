import * as XLSX from 'xlsx';

export function parseXlsx(buffer: Buffer): string {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  return wb.SheetNames.map(name => {
    const ws = wb.Sheets[name];
    return `Sheet: ${name}\n${XLSX.utils.sheet_to_csv(ws)}`;
  }).join('\n\n');
}
