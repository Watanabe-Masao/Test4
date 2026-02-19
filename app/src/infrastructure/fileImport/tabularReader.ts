import * as XLSX from 'xlsx'

/**
 * CSV バイト列のエンコーディングを判定してデコードする。
 * UTF-8 BOM → UTF-8、UTF-8 として妥当なら UTF-8、それ以外は Shift_JIS。
 */
function decodeCSVBytes(bytes: Uint8Array): string {
  // UTF-8 BOM 検出
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return new TextDecoder('utf-8').decode(bytes)
  }

  // UTF-8 として厳密にデコード試行
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    // Shift_JIS（CP932）にフォールバック
    return new TextDecoder('shift_jis').decode(bytes)
  }
}

/**
 * ファイルを2次元配列として読み込む（CSV/Excel共通）
 */
export async function readTabularFile(file: File): Promise<unknown[][]> {
  const buffer = await file.arrayBuffer()

  let workbook: XLSX.WorkBook
  if (file.name.toLowerCase().endsWith('.csv')) {
    // CSV: エンコーディングを手動検出してデコード後にパース
    const text = decodeCSVBytes(new Uint8Array(buffer))
    workbook = XLSX.read(text, { type: 'string' })
  } else {
    workbook = XLSX.read(buffer, { type: 'array' })
  }

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
