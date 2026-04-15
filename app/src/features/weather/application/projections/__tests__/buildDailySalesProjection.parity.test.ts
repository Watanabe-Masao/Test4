/**
 * buildDailySalesProjection — truth-table / parity test
 *
 * unify-period-analysis Phase 6 Step D:
 * `StoreDaySummaryRow[] → DailySalesForCorrelation[]` の変換意味を fixture
 * ベースで凍結する。Step D 実装 (presentation 側の helper 呼び替え) は本
 * テストが緑である状態を維持するだけでよい。
 *
 * ## 凍結対象 (truth table)
 *
 *   1. 同一 dateKey / 複数店舗 row の合算 (sales / customers)
 *   2. dateKey 昇順での安定ソート
 *   3. 欠損日の扱い (入力にない日は projection にも出現しない)
 *   4. 空入力 → 空配列
 *   5. dateKey は入力行の値をそのまま使う (year/month/day から再生成しない)
 *   6. sales / customers の整合 (加算は順序非依存)
 *   7. 単一店舗 / 単一日の pass-through
 *   8. 月跨ぎ入力で日時順が正しくソートされる
 *
 * ## 関連
 *
 *   - app/src/features/weather/application/projections/buildDailySalesProjection.ts
 *   - app/src/application/hooks/useWeatherCorrelation.ts (DailySalesForCorrelation)
 *   - app/src/presentation/components/charts/WeatherAnalysisPanel.tsx (caller)
 */
import { describe, it, expect } from 'vitest'
import { buildDailySalesProjection } from '../buildDailySalesProjection'
import type { StoreDaySummaryRow } from '@/application/queries/summary/StoreDaySummaryHandler'

// ── fixture helper ────────────────────────────────────────

function makeRow(overrides: {
  storeId: string
  dateKey: string
  day: number
  sales: number
  customers: number
  year?: number
  month?: number
}): StoreDaySummaryRow {
  const year = overrides.year ?? 2025
  const month = overrides.month ?? 4
  return {
    year,
    month,
    day: overrides.day,
    dateKey: overrides.dateKey,
    storeId: overrides.storeId,
    sales: overrides.sales,
    coreSales: 0,
    grossSales: overrides.sales,
    discount71: 0,
    discount72: 0,
    discount73: 0,
    discount74: 0,
    discountAmount: 0,
    discountAbsolute: 0,
    purchaseCost: 0,
    purchasePrice: 0,
    interStoreInCost: 0,
    interStoreInPrice: 0,
    interStoreOutCost: 0,
    interStoreOutPrice: 0,
    interDeptInCost: 0,
    interDeptInPrice: 0,
    interDeptOutCost: 0,
    interDeptOutPrice: 0,
    flowersCost: 0,
    flowersPrice: 0,
    directProduceCost: 0,
    directProducePrice: 0,
    costInclusionCost: 0,
    customers: overrides.customers,
  } as unknown as StoreDaySummaryRow
}

// ── truth table ───────────────────────────────────────────

describe('buildDailySalesProjection — pure projection truth table', () => {
  // (1) 同一 dateKey / 複数店舗 row の合算
  it('同一 dateKey の複数店舗 row を sales / customers で合算する', () => {
    const rows = [
      makeRow({ storeId: 'S1', dateKey: '2025-04-01', day: 1, sales: 1000, customers: 50 }),
      makeRow({ storeId: 'S2', dateKey: '2025-04-01', day: 1, sales: 2000, customers: 80 }),
      makeRow({ storeId: 'S3', dateKey: '2025-04-01', day: 1, sales: 500, customers: 30 }),
    ]
    const result = buildDailySalesProjection(rows)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      dateKey: '2025-04-01',
      sales: 3500,
      customers: 160,
    })
  })

  // (2) dateKey 昇順の安定ソート
  it('結果は dateKey の昇順に安定ソートされる', () => {
    const rows = [
      makeRow({ storeId: 'S1', dateKey: '2025-04-15', day: 15, sales: 100, customers: 1 }),
      makeRow({ storeId: 'S1', dateKey: '2025-04-03', day: 3, sales: 200, customers: 2 }),
      makeRow({ storeId: 'S1', dateKey: '2025-04-10', day: 10, sales: 300, customers: 3 }),
      makeRow({ storeId: 'S1', dateKey: '2025-04-01', day: 1, sales: 400, customers: 4 }),
    ]
    const result = buildDailySalesProjection(rows)
    expect(result.map((e) => e.dateKey)).toEqual([
      '2025-04-01',
      '2025-04-03',
      '2025-04-10',
      '2025-04-15',
    ])
  })

  // (3) 欠損日の扱い
  it('入力にない日は projection にも出現しない (padding しない)', () => {
    const rows = [
      makeRow({ storeId: 'S1', dateKey: '2025-04-01', day: 1, sales: 100, customers: 1 }),
      makeRow({ storeId: 'S1', dateKey: '2025-04-05', day: 5, sales: 500, customers: 5 }),
    ]
    const result = buildDailySalesProjection(rows)
    expect(result).toHaveLength(2)
    expect(result.map((e) => e.dateKey)).toEqual(['2025-04-01', '2025-04-05'])
  })

  // (4) 空入力
  it('空 row 配列のときは空配列を返す', () => {
    expect(buildDailySalesProjection([])).toEqual([])
  })

  // (5) dateKey pass-through
  it('dateKey は入力行の値をそのまま使う (year/month/day から再生成しない)', () => {
    const rows = [
      makeRow({
        storeId: 'S1',
        dateKey: '2025-04-01',
        day: 1,
        sales: 100,
        customers: 1,
        // year/month を意図的に day と整合しない値にする
        year: 9999,
        month: 12,
      }),
    ]
    const result = buildDailySalesProjection(rows)
    // year/month に引きずられず row.dateKey がそのまま出る
    expect(result[0].dateKey).toBe('2025-04-01')
  })

  // (6) 順序非依存の合算
  it('row の順序が異なっても合算結果は同じ', () => {
    const a = [
      makeRow({ storeId: 'S1', dateKey: '2025-04-01', day: 1, sales: 100, customers: 1 }),
      makeRow({ storeId: 'S2', dateKey: '2025-04-01', day: 1, sales: 200, customers: 2 }),
      makeRow({ storeId: 'S3', dateKey: '2025-04-01', day: 1, sales: 300, customers: 3 }),
    ]
    const b = [a[2], a[0], a[1]]
    expect(buildDailySalesProjection(a)).toEqual(buildDailySalesProjection(b))
  })

  // (7) 単一店舗 / 単一日の pass-through
  it('単一店舗・単一日は row をそのまま projection に変換', () => {
    const rows = [
      makeRow({ storeId: 'S1', dateKey: '2025-04-07', day: 7, sales: 12345, customers: 67 }),
    ]
    const result = buildDailySalesProjection(rows)
    expect(result).toEqual([{ dateKey: '2025-04-07', sales: 12345, customers: 67 }])
  })

  // (8) 月跨ぎ入力
  it('月跨ぎ入力で dateKey 昇順に正しくソートされる', () => {
    const rows = [
      makeRow({
        storeId: 'S1',
        dateKey: '2025-05-01',
        day: 1,
        sales: 100,
        customers: 1,
        year: 2025,
        month: 5,
      }),
      makeRow({ storeId: 'S1', dateKey: '2025-04-30', day: 30, sales: 200, customers: 2 }),
    ]
    const result = buildDailySalesProjection(rows)
    expect(result.map((e) => e.dateKey)).toEqual(['2025-04-30', '2025-05-01'])
  })
})

// ── parity with current WeatherAnalysisPanel logic ───────

describe('buildDailySalesProjection — parity with legacy presentation logic', () => {
  /**
   * 旧 WeatherAnalysisPanel が presentation 側でやっていた処理を local に再現し、
   * 新 helper と同じ結果が出ることを固定する (差し替え時の安全網)。
   */
  function legacyBuild(
    rows: readonly StoreDaySummaryRow[],
  ): { dateKey: string; sales: number; customers: number }[] {
    const byDay = new Map<number, { sales: number; customers: number; dateKey: string }>()
    for (const row of rows) {
      const existing = byDay.get(row.day) ?? {
        sales: 0,
        customers: 0,
        dateKey: row.dateKey,
      }
      existing.sales += row.sales
      existing.customers += row.customers
      byDay.set(row.day, existing)
    }
    return [...byDay.entries()].map(([, v]) => ({
      dateKey: v.dateKey,
      sales: v.sales,
      customers: v.customers,
    }))
  }

  function sortByDateKey<T extends { dateKey: string }>(arr: readonly T[]): T[] {
    return [...arr].sort((a, b) => a.dateKey.localeCompare(b.dateKey))
  }

  it('単月入力で legacy と新 helper が同じ値を返す (sales + customers 合算)', () => {
    const rows = [
      makeRow({ storeId: 'S1', dateKey: '2025-04-01', day: 1, sales: 1000, customers: 50 }),
      makeRow({ storeId: 'S2', dateKey: '2025-04-01', day: 1, sales: 2000, customers: 80 }),
      makeRow({ storeId: 'S1', dateKey: '2025-04-02', day: 2, sales: 1500, customers: 60 }),
      makeRow({ storeId: 'S2', dateKey: '2025-04-02', day: 2, sales: 2500, customers: 90 }),
    ]
    const fromHelper = buildDailySalesProjection(rows)
    const fromLegacy = sortByDateKey(legacyBuild(rows))
    expect(fromHelper).toEqual(fromLegacy)
  })

  it('複数日・複数店舗の regression matrix', () => {
    const cases: StoreDaySummaryRow[][] = [
      [makeRow({ storeId: 'S1', dateKey: '2025-04-01', day: 1, sales: 1, customers: 1 })],
      [
        makeRow({ storeId: 'S1', dateKey: '2025-04-01', day: 1, sales: 100, customers: 10 }),
        makeRow({ storeId: 'S1', dateKey: '2025-04-02', day: 2, sales: 200, customers: 20 }),
      ],
      [
        makeRow({ storeId: 'S1', dateKey: '2025-04-10', day: 10, sales: 300, customers: 30 }),
        makeRow({ storeId: 'S2', dateKey: '2025-04-10', day: 10, sales: 700, customers: 70 }),
        makeRow({ storeId: 'S3', dateKey: '2025-04-11', day: 11, sales: 400, customers: 40 }),
      ],
    ]
    for (const rows of cases) {
      const fromHelper = buildDailySalesProjection(rows)
      const fromLegacy = sortByDateKey(legacyBuild(rows))
      expect(fromHelper).toEqual(fromLegacy)
    }
  })
})
