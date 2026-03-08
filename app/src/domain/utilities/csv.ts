/**
 * CSV 文字列変換（純粋関数）
 *
 * 2次元配列を RFC 4180 準拠の CSV 文字列に変換する。
 * セル内のカンマ・改行・ダブルクォートを適切にエスケープする。
 *
 * domain 層に配置し、infrastructure（csvExporter）と
 * application（reportExportWorker）の両方から参照する。
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
          if (s.includes(delimiter) || s.includes('\n') || s.includes('"')) {
            return `"${s.replace(/"/g, '""')}"`
          }
          return s
        })
        .join(delimiter),
    )
    .join('\r\n')
}
