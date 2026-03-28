/**
 * データ取得結果の型定義
 *
 * DuckDB からの生データ取得結果をバリデーション付きで表現する。
 * UI は取得結果の status を確認してから値を使用する。
 *
 * ## 設計原則
 *
 * - 境界で検証: 外部（DuckDB）からのデータは取得直後にバリデーション
 * - エラーは伝播: 空データ・不整合は握り潰さず、status で表現
 * - domain 層のため副作用なし
 */

// ─── データ取得ステータス ─────────────────────────────

/** データ取得の状態 */
export type FetchStatus =
  | 'idle' // 未実行（接続なし等）
  | 'loading' // 取得中
  | 'empty' // 取得成功だがデータなし
  | 'valid' // 取得成功、有効データあり
  | 'error' // 取得失敗

// ─── バリデーション済みデータ取得結果 ─────────────────

/**
 * バリデーション済みのデータ取得結果
 *
 * UI はこの型の status を確認してからデータを使用する。
 * status === 'valid' のときのみ data が non-null であることが保証される。
 */
export type ValidatedFetchResult<T> =
  | { readonly status: 'idle'; readonly data: null; readonly error: null }
  | { readonly status: 'loading'; readonly data: null; readonly error: null }
  | {
      readonly status: 'empty'
      readonly data: null
      readonly error: null
      readonly message: string
    }
  | { readonly status: 'valid'; readonly data: T; readonly error: null }
  | { readonly status: 'error'; readonly data: null; readonly error: Error }

// ─── バリデーションルール ─────────────────────────────

/** データ有効性チェックの結果 */
export interface DataValidation {
  /** データが有効か */
  readonly isValid: boolean
  /** 無効な場合の理由 */
  readonly reason: string | null
  /** データの件数 */
  readonly recordCount: number
  /** データに含まれる日付範囲（実データの最小日〜最大日） */
  readonly actualDateRange: {
    readonly minDateKey: string
    readonly maxDateKey: string
  } | null
}

/**
 * レコード配列をバリデーションする純粋関数
 *
 * @param records 取得したレコード配列
 * @param dateKeyField レコード内の日付キーフィールド名
 * @returns バリデーション結果
 */
export function validateRecords(
  records: readonly Record<string, unknown>[],
  dateKeyField: string = 'dateKey',
): DataValidation {
  if (records.length === 0) {
    return { isValid: false, reason: 'データがありません', recordCount: 0, actualDateRange: null }
  }

  const dateKeys: string[] = []
  for (const r of records) {
    const v = r[dateKeyField]
    if (typeof v === 'string') dateKeys.push(v)
  }
  dateKeys.sort()

  const actualDateRange =
    dateKeys.length > 0
      ? { minDateKey: dateKeys[0], maxDateKey: dateKeys[dateKeys.length - 1] }
      : null

  return {
    isValid: true,
    reason: null,
    recordCount: records.length,
    actualDateRange,
  }
}
