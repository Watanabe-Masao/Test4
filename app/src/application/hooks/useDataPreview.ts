/**
 * データプレビューフック
 *
 * ストレージ管理画面のプレビュー表示用。
 * 生レコード配列を受け取り、表示用の軽量オブジェクト（最大200件）に変換する。
 */

/** プレビュー表示用レコード */
export interface PreviewRecord {
  readonly day: number
  readonly storeId: string
  readonly dept: string
  readonly line: string
  readonly klass: string
  readonly amount: number
  readonly qty: number
}

/** 分類別時間帯売上の生レコード構造（IndexedDB から取得） */
interface RawCtsRecord {
  readonly day: number
  readonly storeId: string
  readonly department: { readonly name: string }
  readonly line: { readonly name: string }
  readonly klass: { readonly name: string }
  readonly totalAmount: number
  readonly totalQuantity: number
}

const PREVIEW_LIMIT = 200

/**
 * 分類別時間帯売上の生レコードをプレビュー用に変換する。
 * 最大 200 件まで。
 */
export function transformCtsPreview(
  records: readonly RawCtsRecord[] | undefined,
): readonly PreviewRecord[] {
  if (!records || records.length === 0) return []
  const limit = Math.min(records.length, PREVIEW_LIMIT)
  const result: PreviewRecord[] = []
  for (let i = 0; i < limit; i++) {
    const r = records[i]
    result.push({
      day: r.day,
      storeId: r.storeId,
      dept: r.department.name,
      line: r.line.name,
      klass: r.klass.name,
      amount: r.totalAmount,
      qty: r.totalQuantity,
    })
  }
  return result
}
