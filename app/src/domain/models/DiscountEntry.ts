/**
 * 売変種別（DiscountEntry）— 定義・操作
 *
 * ClassifiedSales.ts から分離。売変種別の定義と配列操作を担う。
 * 種別追加時は DISCOUNT_TYPES のみ変更すればパイプライン全体に伝播する。
 *
 * @responsibility R:unclassified
 */

// ─── 売変種別定義（単一の真実の源） ────────────────────────

/** 売変種別コード */
export type DiscountType = '71' | '72' | '73' | '74'

/** 売変種別の定義エントリ */
export interface DiscountTypeDef {
  readonly type: DiscountType
  readonly label: string
  /** ClassifiedSalesRecord 上のフィールド名 */
  readonly field: 'discount71' | 'discount72' | 'discount73' | 'discount74'
}

/**
 * 売変種別マスタ — 種別追加時はここだけ変更する。
 *
 * ClassifiedSalesRecord のフィールド追加 + ここへのエントリ追加で
 * パイプライン全体（集約 → DailyRecord → StoreResult → チャート）に自動伝播する。
 */
export const DISCOUNT_TYPES: readonly DiscountTypeDef[] = [
  { type: '71', label: '政策売変', field: 'discount71' },
  { type: '72', label: 'レジ値引', field: 'discount72' },
  { type: '73', label: '廃棄売変', field: 'discount73' },
  { type: '74', label: '試食売変', field: 'discount74' },
] as const

// ─── 売変内訳（配列ベース） ─────────────────────────────────

/** 売変1種別のエントリ */
export interface DiscountEntry {
  readonly type: DiscountType
  readonly label: string
  readonly amount: number
}

/** ゼロ内訳（初期値用） */
export const ZERO_DISCOUNT_ENTRIES: readonly DiscountEntry[] = DISCOUNT_TYPES.map((d) => ({
  type: d.type,
  label: d.label,
  amount: 0,
}))

/**
 * ClassifiedSalesRecord から売変内訳配列を生成する。
 * Math.abs() による正規化はここで行う。
 */
export function extractDiscountEntries(rec: {
  readonly discount71: number
  readonly discount72: number
  readonly discount73: number
  readonly discount74: number
}): readonly DiscountEntry[] {
  return DISCOUNT_TYPES.map((d) => {
    const raw = rec[d.field]
    return {
      type: d.type,
      label: d.label,
      amount: Math.abs(typeof raw === 'number' && !Number.isNaN(raw) ? raw : 0),
    }
  })
}

/**
 * 売変内訳配列の合計を算出する（唯一の合算ポイント）。
 * 全ての売変合計はこの関数を経由すること。
 */
export function sumDiscountEntries(entries: readonly DiscountEntry[]): number {
  let total = 0
  for (const e of entries) total += e.amount
  return total
}

/**
 * 2つの売変内訳配列を加算する。
 * 同じ type 同士を合算。
 */
export function addDiscountEntries(
  a: readonly DiscountEntry[],
  b: readonly DiscountEntry[],
): readonly DiscountEntry[] {
  return DISCOUNT_TYPES.map((d) => {
    const aEntry = a.find((e) => e.type === d.type)
    const bEntry = b.find((e) => e.type === d.type)
    return {
      type: d.type,
      label: d.label,
      amount: (aEntry?.amount ?? 0) + (bEntry?.amount ?? 0),
    }
  })
}
