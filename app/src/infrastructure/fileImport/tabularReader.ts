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
 * CSV文字列を2次元配列としてパースする（RFC 4180 準拠）
 *
 * - \r\n / \r を正規化
 * - ダブルクォート囲みフィールドに対応（フィールド内カンマ・改行・エスケープ "" を処理）
 */
export function parseCsvString(csv: string): unknown[][] {
  // 改行を \n に正規化
  const normalized = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (normalized === '') return []

  const rows: unknown[][] = []
  let row: unknown[] = []
  let i = 0

  while (i <= normalized.length) {
    if (i === normalized.length) {
      // 最終フィールド（空文字列の可能性あり）
      row.push('')
      rows.push(row)
      break
    }

    if (normalized[i] === '"') {
      // クォート付きフィールド
      let field = ''
      i++ // 開始 " をスキップ
      while (i < normalized.length) {
        if (normalized[i] === '"') {
          if (i + 1 < normalized.length && normalized[i + 1] === '"') {
            // エスケープされた "" → "
            field += '"'
            i += 2
          } else {
            // フィールド終了
            i++ // 終了 " をスキップ
            break
          }
        } else {
          field += normalized[i]
          i++
        }
      }
      row.push(coerceCell(field))
      // 次の区切り文字を消費
      if (i < normalized.length && normalized[i] === ',') {
        i++
      } else if (i < normalized.length && normalized[i] === '\n') {
        rows.push(row)
        row = []
        i++
      } else {
        // EOF or 末尾
        rows.push(row)
        break
      }
    } else {
      // 非クォートフィールド: 次のカンマまたは改行まで読む
      let end = i
      while (end < normalized.length && normalized[end] !== ',' && normalized[end] !== '\n') {
        end++
      }
      row.push(coerceCell(normalized.slice(i, end)))
      i = end
      if (i < normalized.length && normalized[i] === ',') {
        i++
      } else {
        rows.push(row)
        row = []
        if (i < normalized.length) i++ // \n をスキップ
      }
    }
  }

  return rows
}

/** セル値を型変換する（空文字列 → '', 数値 → number, それ以外 → string） */
function coerceCell(raw: string): unknown {
  const trimmed = raw.trim()
  if (trimmed === '') return ''
  const num = Number(trimmed)
  return isNaN(num) ? trimmed : num
}
