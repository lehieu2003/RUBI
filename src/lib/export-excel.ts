/**
 * CSV utilities for report exports. Output is UTF-8 with BOM so Vietnamese
 * text opens cleanly in Microsoft Excel & Google Sheets.
 */

function escapeCell(cell: string | number | boolean | null | undefined): string {
  if (cell === null || cell === undefined) return '""';
  const str = String(cell).replace(/"/g, '""');
  // Excel evaluates quoted CSV cells starting with = + @ (and - not followed
  // by a digit) as formulas — prefix with ' so they open as plain text.
  if (/^[=+@]|^-(?!\d)/.test(str)) {
    return `"'${str}"`;
  }
  return `"${str}"`;
}

/**
 * Pure CSV builder shared by the client download helper and server route
 * handlers: UTF-8 BOM + fully quoted, escaped cells + CRLF line endings.
 */
export function buildCsv(
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>
): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(','));
  return '\uFEFF' + lines.join('\r\n');
}

export function exportToCSV(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number | boolean | null | undefined>>
) {
  const csvContent = buildCsv(headers, rows);

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
