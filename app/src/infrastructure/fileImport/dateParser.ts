/**
 * 日付パーサー
 *
 * 対応フォーマット:
 * - Excelシリアル値 (数値型)
 * - 日本語形式: 2026年2月15日
 * - ISO形式: 2026-02-15
 * - スラッシュ形式: 2026/02/15
 */

const JAPANESE_DATE_RE = /(\d{4})年(\d{1,2})月(\d{1,2})日/
const ISO_DATE_RE = /(\d{4})-(\d{1,2})-(\d{1,2})/
const SLASH_DATE_RE = /(\d{4})\/(\d{1,2})\/(\d{1,2})/

/**
 * Excel シリアル値を Date に変換（ローカルタイムゾーン）
 * Excel基準日: 1900/1/1 = 1, ただしロータスバグで1900/2/29が存在する前提
 * UTC で年月日を算出し、ローカルタイムゾーンの Date を返す
 */
function fromExcelSerial(serial: number): Date {
  const utc = new Date((serial - 25569) * 86400 * 1000)
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate())
}

/**
 * 汎用日付パーサー
 * @returns 解析成功時は Date、失敗時は null
 */
export function parseDate(value: unknown): Date | null {
  if (value == null) return null

  // Excel シリアル値（数値型）
  if (typeof value === 'number') {
    if (value < 1 || value > 2958465) return null // 有効範囲チェック
    return fromExcelSerial(value)
  }

  const s = String(value).trim()
  if (s === '') return null

  // 数値文字列（Excelシリアル値が文字列として入る場合）
  const num = Number(s)
  if (!isNaN(num) && num > 30000 && num < 100000) {
    return fromExcelSerial(num)
  }

  // 日本語形式: YYYY年MM月DD日
  let m = s.match(JAPANESE_DATE_RE)
  if (m) return new Date(+m[1], +m[2] - 1, +m[3])

  // ISO形式: YYYY-MM-DD
  m = s.match(ISO_DATE_RE)
  if (m) return new Date(+m[1], +m[2] - 1, +m[3])

  // スラッシュ形式: YYYY/MM/DD
  m = s.match(SLASH_DATE_RE)
  if (m) return new Date(+m[1], +m[2] - 1, +m[3])

  return null
}

/**
 * 日付から日(1-31)を取得する
 */
export function getDayOfMonth(value: unknown): number | null {
  const date = parseDate(value)
  return date ? date.getDate() : null
}
