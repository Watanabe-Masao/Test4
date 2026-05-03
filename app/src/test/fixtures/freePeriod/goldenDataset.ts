/**
 * Golden fixture — unify-period-analysis Critical Path Acceptance Suite
 *
 * 役割: 固定期間 preset と自由期間 frame の「同じレーン parity」を検証する
 * 受け入れテスト層の入力。実 DuckDB に依存せず pure JS で完結する。
 *
 * スコープ: 3 店舗 × 10 日（2025-03-05 〜 2025-03-14）。comparison 側の前年
 * 同期間（2024-03-05 〜 2024-03-14）も同じ店舗集合で用意する。
 *
 * 設計原則:
 *   - 値は手計算で summary が検算できる粒度に固定
 *   - 固定期間 preset から生成した frame と、自由期間で手入力した frame が
 *     **同じ日付範囲・同じ店舗・同じ比較条件** を指すことを検証できる形に揃える
 *   - 将来の regression (L4) / property (L3) 追加時も本 fixture を流用できる
 *
 * 参照:
 *   - `projects/completed/unify-period-analysis/acceptance-suite.md`
 *   - `projects/completed/unify-period-analysis/test-plan.md` §Phase 0.5
 *   - `references/01-foundation/free-period-analysis-definition.md`
 */
import type { FreePeriodDailyRow } from '@/application/readModels/freePeriod/FreePeriodTypes'
import type { DateRange } from '@/domain/models/CalendarDate'
import type { PeriodSelection } from '@/domain/models/PeriodSelection'

// ── 基本情報 ────────────────────────────────────────────

/** 対象店舗 ID（3 店舗） */
export const GOLDEN_STORE_IDS = ['store-a', 'store-b', 'store-c'] as const

/** 当期: 2025-03-05 〜 2025-03-14（10 日） */
export const GOLDEN_CURRENT_RANGE: DateRange = {
  from: { year: 2025, month: 3, day: 5 },
  to: { year: 2025, month: 3, day: 14 },
}

/** 比較期: 前年同期間 2024-03-05 〜 2024-03-14（sameRangeLastYear） */
export const GOLDEN_PREV_YEAR_RANGE: DateRange = {
  from: { year: 2024, month: 3, day: 5 },
  to: { year: 2024, month: 3, day: 14 },
}

/** 比較期: 前月 2025-02-05 〜 2025-02-14（previousPeriod） */
export const GOLDEN_PREV_MONTH_RANGE: DateRange = {
  from: { year: 2025, month: 2, day: 5 },
  to: { year: 2025, month: 2, day: 14 },
}

/** 月跨ぎ自由期間: 2025-03-28 〜 2025-04-06（10 日） */
export const GOLDEN_MONTH_BOUNDARY_RANGE: DateRange = {
  from: { year: 2025, month: 3, day: 28 },
  to: { year: 2025, month: 4, day: 6 },
}

// ── PeriodSelection プリセット（固定期間ヘッダ相当） ────────

/** Case 1 相当: 今月、比較なし */
export const GOLDEN_SELECTION_NO_COMPARISON: PeriodSelection = {
  period1: GOLDEN_CURRENT_RANGE,
  period2: GOLDEN_CURRENT_RANGE, // placeholder; comparisonEnabled=false なら参照されない
  comparisonEnabled: false,
  activePreset: 'custom',
}

/** Case 2 相当: 今月 vs 前月（previousPeriod / prevMonth preset） */
export const GOLDEN_SELECTION_VS_PREV_MONTH: PeriodSelection = {
  period1: GOLDEN_CURRENT_RANGE,
  period2: GOLDEN_PREV_MONTH_RANGE,
  comparisonEnabled: true,
  activePreset: 'prevMonth',
}

/** Case 3 相当: 今月 vs 前年同期間（sameRangeLastYear / prevYearSameMonth preset） */
export const GOLDEN_SELECTION_VS_PREV_YEAR: PeriodSelection = {
  period1: GOLDEN_CURRENT_RANGE,
  period2: GOLDEN_PREV_YEAR_RANGE,
  comparisonEnabled: true,
  activePreset: 'prevYearSameMonth',
}

/** Case 4 相当: 月跨ぎ自由期間、比較なし */
export const GOLDEN_SELECTION_MONTH_BOUNDARY: PeriodSelection = {
  period1: GOLDEN_MONTH_BOUNDARY_RANGE,
  period2: GOLDEN_MONTH_BOUNDARY_RANGE,
  comparisonEnabled: false,
  activePreset: 'custom',
}

/** Case 5 相当: 店舗 subset + fallback 想定（store-a と store-b のみ） */
export const GOLDEN_STORE_SUBSET_IDS = ['store-a', 'store-b'] as const

// ── 日別行データ（当期） ────────────────────────────────

/**
 * 当期 10 日 × 3 店舗 = 30 行の raw rows。
 *
 * 手計算用の固定パターン:
 *   - sales: 各店舗の base (store-a=10000, store-b=15000, store-c=20000) × day 値
 *   - customers: sales / 100
 *   - purchaseCost: sales * 0.7
 *   - purchasePrice: sales * 0.8
 *   - discount: sales * 0.05
 */
function makeCurrentRow(
  storeId: string,
  year: number,
  month: number,
  day: number,
  baseSales: number,
): FreePeriodDailyRow {
  const sales = baseSales * day
  const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const dow = new Date(year, month - 1, day).getDay()
  return {
    storeId,
    dateKey,
    day,
    dow,
    sales,
    customers: Math.floor(sales / 100),
    purchaseCost: Math.round(sales * 0.7),
    purchasePrice: Math.round(sales * 0.8),
    discount: Math.round(sales * 0.05),
    isPrevYear: false,
  }
}

const STORE_BASE: Record<(typeof GOLDEN_STORE_IDS)[number], number> = {
  'store-a': 10000,
  'store-b': 15000,
  'store-c': 20000,
}

function buildRowsForRange(
  range: DateRange,
  storeIds: readonly string[],
  isPrevYear: boolean,
): readonly FreePeriodDailyRow[] {
  const rows: FreePeriodDailyRow[] = []
  // 単月レンジ前提（day 5-14 / 28-6 等）。月跨ぎも含めるため Date 演算で生成
  const from = new Date(range.from.year, range.from.month - 1, range.from.day)
  const to = new Date(range.to.year, range.to.month - 1, range.to.day)
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const dd = d.getDate()
    for (const storeId of storeIds) {
      const base = STORE_BASE[storeId as keyof typeof STORE_BASE] ?? 10000
      const row = makeCurrentRow(storeId, y, m, dd, base)
      rows.push({ ...row, isPrevYear })
    }
  }
  return rows
}

/** 当期の日別行（10 日 × 3 店舗 = 30 行） */
export const GOLDEN_CURRENT_ROWS: readonly FreePeriodDailyRow[] = buildRowsForRange(
  GOLDEN_CURRENT_RANGE,
  GOLDEN_STORE_IDS,
  false,
)

/** 比較期（前年同期間）の日別行 — 当期と同じパターン × 0.9（前年値を下回らせる） */
export const GOLDEN_PREV_YEAR_ROWS: readonly FreePeriodDailyRow[] = buildRowsForRange(
  GOLDEN_PREV_YEAR_RANGE,
  GOLDEN_STORE_IDS,
  true,
).map((row) => ({
  ...row,
  sales: Math.round(row.sales * 0.9),
  customers: Math.floor(row.customers * 0.9),
  purchaseCost: Math.round(row.purchaseCost * 0.9),
  purchasePrice: Math.round(row.purchasePrice * 0.9),
  discount: Math.round(row.discount * 0.9),
}))

/** 比較期（前月）の日別行 — 当期と同じパターン × 0.95 */
export const GOLDEN_PREV_MONTH_ROWS: readonly FreePeriodDailyRow[] = buildRowsForRange(
  GOLDEN_PREV_MONTH_RANGE,
  GOLDEN_STORE_IDS,
  true,
).map((row) => ({
  ...row,
  sales: Math.round(row.sales * 0.95),
  customers: Math.floor(row.customers * 0.95),
  purchaseCost: Math.round(row.purchaseCost * 0.95),
  purchasePrice: Math.round(row.purchasePrice * 0.95),
  discount: Math.round(row.discount * 0.95),
}))

/** 月跨ぎ自由期間の日別行 — 3/28 〜 4/6 × 3 店舗 */
export const GOLDEN_MONTH_BOUNDARY_ROWS: readonly FreePeriodDailyRow[] = buildRowsForRange(
  GOLDEN_MONTH_BOUNDARY_RANGE,
  GOLDEN_STORE_IDS,
  false,
)

/** 店舗 subset（store-a, store-b のみ） */
export const GOLDEN_STORE_SUBSET_ROWS: readonly FreePeriodDailyRow[] = buildRowsForRange(
  GOLDEN_CURRENT_RANGE,
  GOLDEN_STORE_SUBSET_IDS,
  false,
)
