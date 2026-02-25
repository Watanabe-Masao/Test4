/**
 * データの出自と期間を表すメタデータ
 *
 * 全てのデータオブジェクトは、自分が「何年何月のデータか」を
 * 自身の中に持つ。外部の状態（settings.targetYear 等）に
 * 依存して年月を解決しない。
 */

/** データの出自情報 */
export interface DataOrigin {
  /** 対象年 */
  readonly year: number
  /** 対象月 (1-12) */
  readonly month: number
  /** ISO 8601 取込日時 */
  readonly importedAt: string
  /** 元ファイル名（任意） */
  readonly sourceFile?: string
}

/**
 * DataEnvelope: 全データ型の封筒
 *
 * 中身（payload）がどの年月に属するかを、データ自身が保持する。
 * これにより、メモリ上のどの時点でも年月を問い合わせ可能になる。
 *
 * checksum: 保存時に payload の内容からハッシュを算出して付与する。
 * ロード時に再計算と照合することで、ストレージ破損を検出できる。
 */
export interface DataEnvelope<T> {
  readonly origin: DataOrigin
  readonly payload: T
  /** payload の MurmurHash3 チェックサム（保存時付与） */
  readonly checksum?: number
}

/** DataEnvelope 形式かどうかを判定する型ガード */
export function isEnvelope<T>(value: T | DataEnvelope<T>): value is DataEnvelope<T> {
  if (value === null || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  if (!('origin' in candidate) || !('payload' in candidate)) return false
  const origin = candidate.origin
  return (
    origin !== null &&
    typeof origin === 'object' &&
    typeof (origin as Record<string, unknown>).year === 'number' &&
    typeof (origin as Record<string, unknown>).month === 'number' &&
    typeof (origin as Record<string, unknown>).importedAt === 'string'
  )
}
