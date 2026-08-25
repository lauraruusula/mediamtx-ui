export type CsvCell = string | number

// Leading characters that spreadsheet applications interpret as formulas when
// a cell is opened (e.g. =SUM(A1) executes, -2+3 evaluates, @cmd links). A
// leading single quote neutralizes them and the quote itself is invisible in
// Excel/Sheets. Negative numbers become text, but this UI's exports only
// carry non-negative counts/bytes.
const CSV_FORMULA_START = /^[=+\-@\t\r]/

export function escapeCsv(value: CsvCell): string {
  let s = String(value ?? '')
  if (CSV_FORMULA_START.test(s)) s = `'${s}`
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Downloads `rows` as a UTF-8 CSV file with a BOM so Excel opens it correctly. */
export function exportCsv(filename: string, headers: string[], rows: CsvCell[][]) {
  const lines = [headers, ...rows].map(row => row.map(escapeCsv).join(','))
  const blob = new Blob([`\ufeff${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
