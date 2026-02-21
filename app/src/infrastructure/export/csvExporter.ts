/**
 * Phase 4.3: CSV エクスポート
 *
 * テーブルデータを CSV 形式でダウンロード可能にする汎用ユーティリティ。
 * BOM 付き UTF-8 で出力し、Excel での文字化けを防止する。
 */

/** CSV エクスポートのオプション */
export interface CsvExportOptions {
  /** ファイル名 (拡張子なし) */
  filename: string
  /** BOM 付き (default: true, Excel 対応) */
  bom?: boolean
  /** 区切り文字 (default: ',') */
  delimiter?: string
}

/**
 * 2次元配列を CSV 文字列に変換する。
 * セル内のカンマ・改行・ダブルクォートを適切にエスケープする。
 */
export function toCsvString(
  rows: readonly (readonly (string | number | null | undefined)[])[],
  delimiter = ',',
): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          if (cell == null) return ''
          const s = String(cell)
          // カンマ、改行、ダブルクォートを含む場合はクォートで囲む
          if (s.includes(delimiter) || s.includes('\n') || s.includes('"')) {
            return `"${s.replace(/"/g, '""')}"`
          }
          return s
        })
        .join(delimiter),
    )
    .join('\r\n')
}

/**
 * CSV 文字列をブラウザからダウンロードさせる。
 */
export function downloadCsv(csvContent: string, options: CsvExportOptions): void {
  const bom = options.bom !== false ? '\uFEFF' : ''
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = `${options.filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 2次元配列を CSV としてダウンロードする (ワンショット API)
 */
export function exportToCsv(
  rows: readonly (readonly (string | number | null | undefined)[])[],
  options: CsvExportOptions,
): void {
  const csv = toCsvString(rows, options.delimiter)
  downloadCsv(csv, options)
}
