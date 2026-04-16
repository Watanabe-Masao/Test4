/**
 * projectCategoryDailySeries — parity / truth-table test
 *
 * unify-period-analysis Phase 6.5 Step B (Phase 6.5-2):
 * `CategoryTimeSalesRecord[] → CategoryDailySeries` 変換意味を fixture ベース
 * で凍結する。Phase 6.5-4 (`useCategoryDailyBundle` hook) / Phase 6.5-5
 * (`YoYWaterfallChart` 載せ替え) は本テストが緑である状態を維持するだけでよい。
 *
 * ## 凍結対象 (truth table)
 *
 *   1. deptCode 昇順での安定ソート (localeCompare)
 *   2. 各 entry 内の dateKey 昇順での安定ソート
 *   3. 同一 (deptCode, dateKey) の row 合算 (store / timeSlot 畳み込み)
 *   4. 欠損日は配列に現れない (padding しない)
 *   5. store subset フィルタ
 *   6. deptCodes subset フィルタ
 *   7. 両 subset 同時適用
 *   8. 空 subset は全対象
 *   9. dayCount の伝搬 (pass-through)
 *  10. 空入力 — empty series
 *  11. EMPTY_CATEGORY_DAILY_SERIES の shape 固定
 *  12. grandTotals = Σ entries.totals, entry.totals = Σ daily
 *  13. dateKey が (year, month, day) から YYYY-MM-DD 形式で生成される
 *  14. deptName は同一 deptCode の最初の row から pin
 *  15. customers は常に 0 (Category record に元データなし、contract 面は保持)
 *  16. totalAmount/totalQuantity → sales/salesQty の pass-through
 *
 * ## 関連
 *
 *   - app/src/application/hooks/categoryDaily/projectCategoryDailySeries.ts
 *   - app/src/application/hooks/categoryDaily/CategoryDailyBundle.types.ts
 *   - projects/completed/unify-period-analysis/phase-6-5-step-b-design.md
 */
import { describe, it, expect } from 'vitest'
import {
  projectCategoryDailySeries,
  EMPTY_CATEGORY_DAILY_SERIES,
} from '../projectCategoryDailySeries'
import type { CategoryTimeSalesRecord } from '@/domain/models/DataTypes'
import type { CategoryDailySeries } from '../CategoryDailyBundle.types'

// ── helpers ───────────────────────────────────────────────

function makeRow(overrides: {
  storeId: string
  deptCode: string
  deptName?: string
  year?: number
  month?: number
  day: number
  totalAmount: number
  totalQuantity: number
}): CategoryTimeSalesRecord {
  return {
    year: overrides.year ?? 2025,
    month: overrides.month ?? 4,
    day: overrides.day,
    storeId: overrides.storeId,
    department: {
      code: overrides.deptCode,
      name: overrides.deptName ?? `Dept ${overrides.deptCode}`,
    },
    line: { code: '', name: '' },
    klass: { code: '', name: '' },
    timeSlots: [],
    totalQuantity: overrides.totalQuantity,
    totalAmount: overrides.totalAmount,
  }
}

// ── truth table ───────────────────────────────────────────

describe('projectCategoryDailySeries — pure projection truth table', () => {
  // (1) deptCode 昇順
  it('entries は deptCode の localeCompare 昇順で安定ソートされる', () => {
    const rows = [
      makeRow({ storeId: 'S1', deptCode: 'D3', day: 1, totalAmount: 100, totalQuantity: 1 }),
      makeRow({ storeId: 'S1', deptCode: 'D1', day: 1, totalAmount: 200, totalQuantity: 2 }),
      makeRow({ storeId: 'S1', deptCode: 'D2', day: 1, totalAmount: 300, totalQuantity: 3 }),
    ]
    const result = projectCategoryDailySeries(rows, { dayCount: 1 })
    expect(result.entries.map((e) => e.deptCode)).toEqual(['D1', 'D2', 'D3'])
  })

  // (2) dateKey 昇順
  it('各 entry 内の daily は dateKey の昇順で安定ソートされる', () => {
    const rows = [
      makeRow({ storeId: 'S1', deptCode: 'D1', day: 15, totalAmount: 100, totalQuantity: 1 }),
      makeRow({ storeId: 'S1', deptCode: 'D1', day: 3, totalAmount: 200, totalQuantity: 2 }),
      makeRow({ storeId: 'S1', deptCode: 'D1', day: 10, totalAmount: 300, totalQuantity: 3 }),
      makeRow({ storeId: 'S1', deptCode: 'D1', day: 1, totalAmount: 400, totalQuantity: 4 }),
    ]
    const result = projectCategoryDailySeries(rows, { dayCount: 15 })
    expect(result.entries[0].daily.map((d) => d.dateKey)).toEqual([
      '2025-04-01',
      '2025-04-03',
      '2025-04-10',
      '2025-04-15',
    ])
  })

  // (3) 同一 (deptCode, dateKey) の合算 (複数 store/timeSlot を畳み込む)
  it('同じ (deptCode, dateKey) の row が複数あれば合算される (store × timeSlot 畳み込み)', () => {
    const rows = [
      makeRow({ storeId: 'S1', deptCode: 'D1', day: 1, totalAmount: 100, totalQuantity: 10 }),
      makeRow({ storeId: 'S2', deptCode: 'D1', day: 1, totalAmount: 200, totalQuantity: 20 }),
      makeRow({ storeId: 'S3', deptCode: 'D1', day: 1, totalAmount: 300, totalQuantity: 30 }),
    ]
    const result = projectCategoryDailySeries(rows, { dayCount: 1 })
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].daily).toHaveLength(1)
    expect(result.entries[0].daily[0]).toEqual({
      dateKey: '2025-04-01',
      sales: 600,
      customers: 0,
      salesQty: 60,
    })
  })

  // (4) 欠損日 padding なし
  it('入力にない日は daily 配列に出現しない (no padding)', () => {
    const rows = [
      makeRow({ storeId: 'S1', deptCode: 'D1', day: 1, totalAmount: 100, totalQuantity: 1 }),
      makeRow({ storeId: 'S1', deptCode: 'D1', day: 5, totalAmount: 500, totalQuantity: 5 }),
    ]
    const result = projectCategoryDailySeries(rows, { dayCount: 5 })
    expect(result.entries[0].daily.map((d) => d.dateKey)).toEqual(['2025-04-01', '2025-04-05'])
  })

  // (5) store subset
  it('storeIds option が指定されたら subset 外の row を除外する', () => {
    const rows = [
      makeRow({ storeId: 'S1', deptCode: 'D1', day: 1, totalAmount: 100, totalQuantity: 1 }),
      makeRow({ storeId: 'S2', deptCode: 'D1', day: 1, totalAmount: 200, totalQuantity: 2 }),
      makeRow({ storeId: 'S3', deptCode: 'D1', day: 1, totalAmount: 300, totalQuantity: 3 }),
    ]
    const subset = new Set(['S1', 'S3'])
    const result = projectCategoryDailySeries(rows, { dayCount: 1, storeIds: subset })
    expect(result.entries[0].daily[0].sales).toBe(400)
    expect(result.entries[0].daily[0].salesQty).toBe(4)
  })

  // (6) deptCode subset
  it('deptCodes option が指定されたら subset 外の dept を除外する', () => {
    const rows = [
      makeRow({ storeId: 'S1', deptCode: 'D1', day: 1, totalAmount: 100, totalQuantity: 1 }),
      makeRow({ storeId: 'S1', deptCode: 'D2', day: 1, totalAmount: 200, totalQuantity: 2 }),
      makeRow({ storeId: 'S1', deptCode: 'D3', day: 1, totalAmount: 300, totalQuantity: 3 }),
    ]
    const subset = new Set(['D1', 'D3'])
    const result = projectCategoryDailySeries(rows, { dayCount: 1, deptCodes: subset })
    expect(result.entries.map((e) => e.deptCode)).toEqual(['D1', 'D3'])
    expect(result.grandTotals.sales).toBe(400)
  })

  // (7) 両 subset 同時
  it('storeIds / deptCodes の両 subset を同時に適用する', () => {
    const rows = [
      makeRow({ storeId: 'S1', deptCode: 'D1', day: 1, totalAmount: 100, totalQuantity: 1 }),
      makeRow({ storeId: 'S1', deptCode: 'D2', day: 1, totalAmount: 200, totalQuantity: 2 }),
      makeRow({ storeId: 'S2', deptCode: 'D1', day: 1, totalAmount: 400, totalQuantity: 4 }),
      makeRow({ storeId: 'S2', deptCode: 'D2', day: 1, totalAmount: 800, totalQuantity: 8 }),
    ]
    const result = projectCategoryDailySeries(rows, {
      dayCount: 1,
      storeIds: new Set(['S1']),
      deptCodes: new Set(['D1']),
    })
    // S1 × D1 のみ = 100
    expect(result.grandTotals.sales).toBe(100)
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].deptCode).toBe('D1')
  })

  // (8) 空 subset
  it('空 subset のときは全対象 (undefined と同じ動作)', () => {
    const rows = [
      makeRow({ storeId: 'S1', deptCode: 'D1', day: 1, totalAmount: 100, totalQuantity: 1 }),
      makeRow({ storeId: 'S1', deptCode: 'D2', day: 1, totalAmount: 200, totalQuantity: 2 }),
    ]
    const result = projectCategoryDailySeries(rows, {
      dayCount: 1,
      storeIds: new Set(),
      deptCodes: new Set(),
    })
    expect(result.entries).toHaveLength(2)
    expect(result.grandTotals.sales).toBe(300)
  })

  // (9) dayCount 伝搬
  it('options.dayCount が結果にそのまま伝搬する', () => {
    const result = projectCategoryDailySeries(
      [makeRow({ storeId: 'S1', deptCode: 'D1', day: 1, totalAmount: 1, totalQuantity: 1 })],
      { dayCount: 30 },
    )
    expect(result.dayCount).toBe(30)
  })

  // (10) 空入力
  it('空 row 配列のときは entries 空 + grandTotals 0 + dayCount pass-through', () => {
    const result = projectCategoryDailySeries([], { dayCount: 7 })
    expect(result.entries).toEqual([])
    expect(result.grandTotals).toEqual({ sales: 0, customers: 0, salesQty: 0 })
    expect(result.dayCount).toBe(7)
  })

  // (11) EMPTY constant
  it('EMPTY_CATEGORY_DAILY_SERIES は empty entries / zero totals / dayCount 0', () => {
    expect(EMPTY_CATEGORY_DAILY_SERIES.entries).toEqual([])
    expect(EMPTY_CATEGORY_DAILY_SERIES.grandTotals).toEqual({
      sales: 0,
      customers: 0,
      salesQty: 0,
    })
    expect(EMPTY_CATEGORY_DAILY_SERIES.dayCount).toBe(0)
  })

  // (12) totals 整合
  it('grandTotals は Σ entries.totals、entry.totals は Σ daily に一致する', () => {
    const rows = [
      makeRow({ storeId: 'S1', deptCode: 'D1', day: 1, totalAmount: 100, totalQuantity: 10 }),
      makeRow({ storeId: 'S1', deptCode: 'D1', day: 2, totalAmount: 200, totalQuantity: 20 }),
      makeRow({ storeId: 'S1', deptCode: 'D2', day: 1, totalAmount: 300, totalQuantity: 30 }),
    ]
    const result = projectCategoryDailySeries(rows, { dayCount: 2 })
    for (const entry of result.entries) {
      const sumSales = entry.daily.reduce((s, d) => s + d.sales, 0)
      const sumQty = entry.daily.reduce((s, d) => s + d.salesQty, 0)
      expect(entry.totals.sales).toBe(sumSales)
      expect(entry.totals.salesQty).toBe(sumQty)
    }
    const grandSales = result.entries.reduce((s, e) => s + e.totals.sales, 0)
    expect(result.grandTotals.sales).toBe(grandSales)
    expect(result.grandTotals.sales).toBe(600)
  })

  // (13) dateKey 生成
  it('dateKey は (year, month, day) から YYYY-MM-DD 形式で生成される (zero-pad)', () => {
    const rows = [
      makeRow({
        storeId: 'S1',
        deptCode: 'D1',
        year: 2025,
        month: 4,
        day: 5,
        totalAmount: 100,
        totalQuantity: 1,
      }),
    ]
    const result = projectCategoryDailySeries(rows, { dayCount: 1 })
    expect(result.entries[0].daily[0].dateKey).toBe('2025-04-05')
  })

  // (14) deptName pin
  it('deptName は同一 deptCode の最初の row から pin される', () => {
    const rows = [
      makeRow({
        storeId: 'S1',
        deptCode: 'D1',
        deptName: '生鮮食品',
        day: 1,
        totalAmount: 100,
        totalQuantity: 1,
      }),
      makeRow({
        storeId: 'S2',
        deptCode: 'D1',
        deptName: 'Ignored',
        day: 2,
        totalAmount: 200,
        totalQuantity: 2,
      }),
    ]
    const result = projectCategoryDailySeries(rows, { dayCount: 2 })
    expect(result.entries[0].deptName).toBe('生鮮食品')
  })

  // (15) customers は常に 0
  it('customers は常に 0 (Category record に customers フィールドがないため)', () => {
    const rows = [
      makeRow({ storeId: 'S1', deptCode: 'D1', day: 1, totalAmount: 1000, totalQuantity: 50 }),
    ]
    const result = projectCategoryDailySeries(rows, { dayCount: 1 })
    expect(result.entries[0].daily[0].customers).toBe(0)
    expect(result.entries[0].totals.customers).toBe(0)
    expect(result.grandTotals.customers).toBe(0)
  })

  // (16) totalAmount/totalQuantity pass-through
  it('totalAmount → sales / totalQuantity → salesQty の pass-through', () => {
    const rows = [
      makeRow({ storeId: 'S1', deptCode: 'D1', day: 1, totalAmount: 12345, totalQuantity: 678 }),
    ]
    const result = projectCategoryDailySeries(rows, { dayCount: 1 })
    expect(result.entries[0].daily[0].sales).toBe(12345)
    expect(result.entries[0].daily[0].salesQty).toBe(678)
  })
})

// ── caller-pattern parity ─────────────────────────────────

describe('projectCategoryDailySeries — caller-pattern parity', () => {
  it('current/comparison ペアの典型ユースケース (YoYWaterfall)', () => {
    const storeIds = new Set(['S1', 'S2'])
    const currentRows = [
      makeRow({ storeId: 'S1', deptCode: 'D1', day: 1, totalAmount: 1000, totalQuantity: 50 }),
      makeRow({ storeId: 'S2', deptCode: 'D1', day: 1, totalAmount: 2000, totalQuantity: 100 }),
      makeRow({ storeId: 'S1', deptCode: 'D2', day: 1, totalAmount: 500, totalQuantity: 25 }),
    ]
    const comparisonRows = [
      makeRow({
        storeId: 'S1',
        deptCode: 'D1',
        day: 1,
        year: 2024,
        totalAmount: 900,
        totalQuantity: 45,
      }),
      makeRow({
        storeId: 'S2',
        deptCode: 'D1',
        day: 1,
        year: 2024,
        totalAmount: 1800,
        totalQuantity: 90,
      }),
    ]

    const current = projectCategoryDailySeries(currentRows, { dayCount: 1, storeIds })
    const comparison = projectCategoryDailySeries(comparisonRows, { dayCount: 1, storeIds })

    expect(current.grandTotals.sales).toBe(3500)
    expect(comparison.grandTotals.sales).toBe(2700)
    // Current は D1 + D2、Comparison は D1 のみ
    expect(current.entries.map((e) => e.deptCode)).toEqual(['D1', 'D2'])
    expect(comparison.entries.map((e) => e.deptCode)).toEqual(['D1'])
  })

  it('結果型が CategoryDailySeries shape を満たす (compile-time + runtime)', () => {
    const result: CategoryDailySeries = projectCategoryDailySeries(
      [makeRow({ storeId: 'S1', deptCode: 'D1', day: 1, totalAmount: 100, totalQuantity: 1 })],
      { dayCount: 1 },
    )
    expect(result).toBeDefined()
    expect(typeof result.dayCount).toBe('number')
    expect(Array.isArray(result.entries)).toBe(true)
    expect(typeof result.grandTotals.sales).toBe('number')
  })
})
