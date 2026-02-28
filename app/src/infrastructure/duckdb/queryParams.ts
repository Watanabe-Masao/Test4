/**
 * DuckDB クエリパラメータのバリデーション
 *
 * SQL インジェクションを構造的に防止するため、
 * クエリに渡す全てのパラメータを Branded Type で検証する。
 *
 * - ValidatedDateKey: YYYY-MM-DD 形式が保証された文字列
 * - validateStoreId: SQL メタ文字を含まないことが保証された文字列
 * - validateYearMonth: 妥当な年月の数値
 */

// ─── Branded Types ───────────────────────────────────────

/** 検証済み日付キー（YYYY-MM-DD 形式が保証された文字列） */
export type ValidatedDateKey = string & { readonly __brand: 'ValidatedDateKey' }

// ─── バリデーション関数 ──────────────────────────────────

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/**
 * 日付文字列を検証し ValidatedDateKey を返す。
 * 不正な形式の場合は例外をスローする。
 */
export function validateDateKey(raw: string): ValidatedDateKey {
  if (!DATE_KEY_PATTERN.test(raw)) {
    throw new Error(`Invalid date key: "${raw}". Expected YYYY-MM-DD format.`)
  }
  return raw as ValidatedDateKey
}

/** SQL メタ文字パターン（シングルクォート、セミコロン、バックスラッシュ、ダブルダッシュ） */
const SQL_META_CHARS = /['";\\]|--/

/**
 * 店舗 ID を検証する。SQL メタ文字を含む場合は例外をスローする。
 */
export function validateStoreId(raw: string): string {
  if (SQL_META_CHARS.test(raw)) {
    throw new Error(`Invalid store ID: "${raw}". Contains disallowed characters.`)
  }
  return raw
}

/**
 * 部門・ラインコード等のカテゴリコードを検証する。
 * SQL メタ文字を含む場合は例外をスローする。
 */
export function validateCode(raw: string): string {
  if (SQL_META_CHARS.test(raw)) {
    throw new Error(`Invalid code: "${raw}". Contains disallowed characters.`)
  }
  return raw
}

/**
 * 年月を検証する。妥当な範囲であることを確認する。
 */
export function validateYearMonth(year: number, month: number): void {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(`Invalid year: ${year}. Expected integer between 2000 and 2100.`)
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}. Expected integer between 1 and 12.`)
  }
}
