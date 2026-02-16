import * as XLSX from 'xlsx'

/**
 * ファイルを2次元配列として読み込む（CSV/Excel共通）
 */
export async function readTabularFile(file: File): Promise<unknown[][]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
  if (!firstSheet) return []

  const rows: unknown[][] = XLSX.utils.sheet_to_json(firstSheet, {
    header: 1,
    defval: '',
    raw: true,
  })

  return rows
}

/**
 * CSV文字列を2次元配列としてパースする（テスト用）
 */
export function parseCsvString(csv: string): unknown[][] {
  return csv
    .trim()
    .split('\n')
    .map((line) =>
      line.split(',').map((cell) => {
        const trimmed = cell.trim()
        if (trimmed === '') return ''
        const num = Number(trimmed)
        return isNaN(num) ? trimmed : num
      }),
    )
}
