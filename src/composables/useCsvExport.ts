export type CsvCell = string | number

function escapeCsv(value: CsvCell): string {
  const s = String(value ?? '')
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
