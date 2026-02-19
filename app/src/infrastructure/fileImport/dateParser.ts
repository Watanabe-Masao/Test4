/**
 * 日付パーサー
 *
 * 対応フォーマット:
 * - Excelシリアル値 (数値型)
 * - 日本語形式: 2026年2月15日 / 2026年2月15日(土)
 * - 和暦形式: 令和8年2月15日 / R8.2.15
 * - ISO形式: 2026-02-15
 * - スラッシュ形式: 2026/02/15 / 2026/2/15
 * - 短縮年スラッシュ形式: 26/02/15 (2000年代と推定)
 * - MM/DD形式: 2/15 (年はコンテキストから推定)
 * - ドット形式: 2026.02.15 / 2026.2.15
 * - Date オブジェクト (そのまま返す)
 */

const JAPANESE_DATE_RE = /(\d{4})年(\d{1,2})月(\d{1,2})日/
const WAREKI_KANJI_RE = /(?:令和|Ｒ|R)\s*(\d{1,2})年(\d{1,2})月(\d{1,2})日/
const WAREKI_DOT_RE = /^(?:R|Ｒ)(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{1,2})$/
const ISO_DATE_RE = /(\d{4})-(\d{1,2})-(\d{1,2})/
const SLASH_DATE_RE = /(\d{4})\/(\d{1,2})\/(\d{1,2})/
const SHORT_YEAR_SLASH_RE = /^(\d{2})\/(\d{1,2})\/(\d{1,2})$/
const MONTH_DAY_SLASH_RE = /^(\d{1,2})\/(\d{1,2})$/
const DOT_DATE_RE = /(\d{4})\.(\d{1,2})\.(\d{1,2})/
const SHORT_YEAR_DOT_RE = /^(\d{2})\.(\d{1,2})\.(\d{1,2})$/

/** 令和元年 = 2019 */
const REIWA_BASE = 2018

/**
 * Excel シリアル値を Date に変換（ローカルタイムゾーン）
 * Excel基準日: 1900/1/1 = 1, ただしロータスバグで1900/2/29が存在する前提
 * UTC で年月日を算出し、ローカルタイムゾーンの Date を返す
 */
function fromExcelSerial(serial: number): Date {
  const utc = new Date((serial - 25569) * 86400 * 1000)
  return new Date(utc.getUTCFullYear(), utc.getUTCMonth(), utc.getUTCDate())
}

/** 日付の妥当性チェック */
function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const d = new Date(year, month - 1, day)
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day
}

/** 安全に Date を生成（妥当性チェック付き） */
function safeDate(year: number, month: number, day: number): Date | null {
  if (!isValidDate(year, month, day)) return null
  return new Date(year, month - 1, day)
}

/** 2桁年→4桁年に変換（00-49 → 2000-2049, 50-99 → 1950-1999） */
function expandShortYear(y: number): number {
  return y < 50 ? 2000 + y : 1900 + y
}

/**
 * 汎用日付パーサー
 * @param value パースする値
 * @param contextYear MM/DD形式でのフォールバック年（省略時は現在年）
 * @returns 解析成功時は Date、失敗時は null
 */
export function parseDate(value: unknown, contextYear?: number): Date | null {
  if (value == null) return null

  // Date オブジェクトはそのまま返す
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value
  }

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

  // 和暦漢字形式: 令和8年2月15日
  let m = s.match(WAREKI_KANJI_RE)
  if (m) return safeDate(REIWA_BASE + +m[1], +m[2], +m[3])

  // 和暦ドット形式: R8.2.15
  m = s.match(WAREKI_DOT_RE)
  if (m) return safeDate(REIWA_BASE + +m[1], +m[2], +m[3])

  // 日本語形式: YYYY年MM月DD日 / YYYY年MM月DD日(曜)
  m = s.match(JAPANESE_DATE_RE)
  if (m) return safeDate(+m[1], +m[2], +m[3])

  // ISO形式: YYYY-MM-DD
  m = s.match(ISO_DATE_RE)
  if (m) return safeDate(+m[1], +m[2], +m[3])

  // スラッシュ形式: YYYY/MM/DD
  m = s.match(SLASH_DATE_RE)
  if (m) return safeDate(+m[1], +m[2], +m[3])

  // 短縮年スラッシュ形式: YY/MM/DD
  m = s.match(SHORT_YEAR_SLASH_RE)
  if (m) return safeDate(expandShortYear(+m[1]), +m[2], +m[3])

  // ドット形式: YYYY.MM.DD
  m = s.match(DOT_DATE_RE)
  if (m) return safeDate(+m[1], +m[2], +m[3])

  // 短縮年ドット形式: YY.MM.DD
  m = s.match(SHORT_YEAR_DOT_RE)
  if (m) return safeDate(expandShortYear(+m[1]), +m[2], +m[3])

  // MM/DD形式: 2/15 (年はcontextYearまたは現在年)
  m = s.match(MONTH_DAY_SLASH_RE)
  if (m) {
    const fallbackYear = contextYear ?? new Date().getFullYear()
    return safeDate(fallbackYear, +m[1], +m[2])
  }

  return null
}

/**
 * 日付から日(1-31)を取得する
 */
export function getDayOfMonth(value: unknown): number | null {
  const date = parseDate(value)
  return date ? date.getDate() : null
}

/**
 * データ行の日付列から対象年月を自動検出する
 *
 * 最初にパースできた日付の年月を返す。
 * 対応フォーマット: Excelシリアル値、YYYY年MM月DD日、YYYY年MM月DD日(曜)、YYYY-MM-DD、YYYY/M/D
 *
 * @param rows データ行の配列
 * @param dateColIndex 日付が入っている列インデックス（デフォルト: 0）
 * @param dataStartRow データ開始行（ヘッダーをスキップ）
 * @returns { year, month } または null
 */
export function detectYearMonth(
  rows: readonly unknown[][],
  dateColIndex: number = 0,
  dataStartRow: number = 2,
): { year: number; month: number } | null {
  for (let i = dataStartRow; i < rows.length; i++) {
    const row = rows[i] as unknown[]
    if (!row || row.length <= dateColIndex) continue
    const date = parseDate(row[dateColIndex])
    if (date) {
      return { year: date.getFullYear(), month: date.getMonth() + 1 }
    }
  }
  return null
}
