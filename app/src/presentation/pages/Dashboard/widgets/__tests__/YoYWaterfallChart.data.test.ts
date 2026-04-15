/**
 * Phase 6.5-5b: `buildCategoryData` の入力を `CategoryTimeSalesRecord[]` から
 * `CategoryDailySeries | null` に切替えた (dept-grain projection 経由)。
 * Shapley 5-factor (buildFactorData) は leaf-grain 必須の intentional
 * permanent floor として CTS 入力を継続利用する。本テストは前者 dept-only
 * ウォーターフォールの変換意味を固定する。
 */
import { describe, it, expect } from 'vitest'
import {
  DECOMP_HELP,
  buildCategoryData,
} from '@/presentation/pages/Dashboard/widgets/YoYWaterfallChart.data'
import type { CategoryDailySeries } from '@/application/hooks/categoryDaily/CategoryDailyBundle.types'

function makeSeries(
  depts: readonly { code: string; name: string; sales: number }[],
): CategoryDailySeries {
  return {
    entries: depts.map((d) => ({
      deptCode: d.code,
      deptName: d.name,
      daily: [],
      totals: { sales: d.sales, customers: 0, salesQty: 0 },
    })),
    grandTotals: {
      sales: depts.reduce((s, d) => s + d.sales, 0),
      customers: 0,
      salesQty: 0,
    },
    dayCount: 0,
  }
}

describe('DECOMP_HELP', () => {
  it('has entries for levels 2, 3, 5', () => {
    expect(DECOMP_HELP[2]).toBeTruthy()
    expect(DECOMP_HELP[3]).toBeTruthy()
    expect(DECOMP_HELP[5]).toBeTruthy()
  })

  it('level 2 has 2 items', () => {
    expect(DECOMP_HELP[2].items).toHaveLength(2)
    expect(DECOMP_HELP[2].items[0].label).toBe('客数効果')
    expect(DECOMP_HELP[2].items[1].label).toBe('客単価効果')
  })

  it('level 3 has 3 items', () => {
    expect(DECOMP_HELP[3].items).toHaveLength(3)
    expect(DECOMP_HELP[3].items.map((i) => i.label)).toEqual(['客数効果', '点数効果', '単価効果'])
  })

  it('level 5 has 4 items', () => {
    expect(DECOMP_HELP[5].items).toHaveLength(4)
    expect(DECOMP_HELP[5].items.map((i) => i.label)).toContain('価格効果')
    expect(DECOMP_HELP[5].items.map((i) => i.label)).toContain('構成比変化効果')
  })

  it('each item has label, formula, desc', () => {
    for (const level of [2, 3, 5] as const) {
      for (const item of DECOMP_HELP[level].items) {
        expect(item.label.length).toBeGreaterThan(0)
        expect(item.formula.length).toBeGreaterThan(0)
        expect(item.desc.length).toBeGreaterThan(0)
      }
    }
  })
})

describe('buildCategoryData (Phase 6.5-5b — CategoryDailySeries 入力)', () => {
  const baseParams = {
    hasComparison: true,
    prevSales: 1000,
    curSales: 1100,
    prevLabel: '前年',
    curLabel: '当年',
  }

  it('returns empty result when categoryDailySeries is null', () => {
    const result = buildCategoryData({
      ...baseParams,
      categoryDailySeries: null,
      categoryDailyPrevSeries: makeSeries([{ code: 'D1', name: 'Dept1', sales: 500 }]),
    })
    expect(result.items).toEqual([])
    expect(result.residual).toBe(0)
    expect(result.residualPct).toBe(0)
  })

  it('returns empty result when categoryDailyPrevSeries is null', () => {
    const result = buildCategoryData({
      ...baseParams,
      categoryDailySeries: makeSeries([{ code: 'D1', name: 'Dept1', sales: 500 }]),
      categoryDailyPrevSeries: null,
    })
    expect(result.items).toEqual([])
  })

  it('returns empty result when categoryDailySeries has no entries', () => {
    const result = buildCategoryData({
      ...baseParams,
      categoryDailySeries: makeSeries([]),
      categoryDailyPrevSeries: makeSeries([{ code: 'D1', name: 'Dept1', sales: 500 }]),
    })
    expect(result.items).toEqual([])
  })

  it('returns empty when hasComparison is false', () => {
    const result = buildCategoryData({
      ...baseParams,
      hasComparison: false,
      categoryDailySeries: makeSeries([{ code: 'D1', name: 'Dept1', sales: 600 }]),
      categoryDailyPrevSeries: makeSeries([{ code: 'D1', name: 'Dept1', sales: 500 }]),
    })
    expect(result.items).toEqual([])
  })

  it('returns empty when prevSales <= 0', () => {
    const result = buildCategoryData({
      ...baseParams,
      prevSales: 0,
      categoryDailySeries: makeSeries([{ code: 'D1', name: 'Dept1', sales: 600 }]),
      categoryDailyPrevSeries: makeSeries([{ code: 'D1', name: 'Dept1', sales: 500 }]),
    })
    expect(result.items).toEqual([])
  })

  it('builds items with start and end anchors', () => {
    const result = buildCategoryData({
      ...baseParams,
      categoryDailySeries: makeSeries([
        { code: 'D1', name: 'Dept1', sales: 600 },
        { code: 'D2', name: 'Dept2', sales: 500 },
      ]),
      categoryDailyPrevSeries: makeSeries([
        { code: 'D1', name: 'Dept1', sales: 500 },
        { code: 'D2', name: 'Dept2', sales: 500 },
      ]),
    })
    // First item should be prev label total
    expect(result.items[0].name).toBe('前年売上')
    expect(result.items[0].isTotal).toBe(true)
    expect(result.items[0].value).toBe(1000) // 500+500
    // Last item should be cur label total
    const last = result.items[result.items.length - 1]
    expect(last.name).toBe('当年売上')
    expect(last.isTotal).toBe(true)
    expect(last.value).toBe(1100) // 600+500
  })

  it('includes positive department diff items', () => {
    const result = buildCategoryData({
      ...baseParams,
      categoryDailySeries: makeSeries([{ code: 'D1', name: 'Dept1', sales: 700 }]),
      categoryDailyPrevSeries: makeSeries([{ code: 'D1', name: 'Dept1', sales: 500 }]),
    })
    const deptItem = result.items.find((i) => i.name === 'Dept1')
    expect(deptItem?.value).toBe(200)
    expect(deptItem?.bar).toBe(200)
  })

  it('sorts department items by absolute diff descending', () => {
    const result = buildCategoryData({
      ...baseParams,
      categoryDailySeries: makeSeries([
        { code: 'D1', name: 'Dept1', sales: 600 }, // +100
        { code: 'D2', name: 'Dept2', sales: 500 }, // +300
        { code: 'D3', name: 'Dept3', sales: 300 }, // -200
      ]),
      categoryDailyPrevSeries: makeSeries([
        { code: 'D1', name: 'Dept1', sales: 500 },
        { code: 'D2', name: 'Dept2', sales: 200 },
        { code: 'D3', name: 'Dept3', sales: 500 },
      ]),
    })
    const deptItems = result.items.filter((i) => !i.isTotal && i.name !== '調整')
    // Largest abs diff should come first: D2 (+300), D3 (-200), D1 (+100)
    expect(deptItems[0].name).toBe('Dept2')
    expect(deptItems[1].name).toBe('Dept3')
    expect(deptItems[2].name).toBe('Dept1')
  })

  it('groups remaining depts as "その他" when more than 8', () => {
    const curDepts: { code: string; name: string; sales: number }[] = []
    const prevDepts: { code: string; name: string; sales: number }[] = []
    for (let i = 0; i < 10; i++) {
      curDepts.push({ code: `D${i}`, name: `Dept${i}`, sales: 100 + i * 10 })
      prevDepts.push({ code: `D${i}`, name: `Dept${i}`, sales: 100 })
    }
    const result = buildCategoryData({
      ...baseParams,
      prevSales: 1000,
      curSales: 1450,
      categoryDailySeries: makeSeries(curDepts),
      categoryDailyPrevSeries: makeSeries(prevDepts),
    })
    const otherItem = result.items.find((i) => i.name.startsWith('その他'))
    expect(otherItem).toBeTruthy()
    expect(otherItem?.name).toContain('部門')
  })

  it('residual is near zero when anchors match', () => {
    const result = buildCategoryData({
      ...baseParams,
      categoryDailySeries: makeSeries([{ code: 'D1', name: 'Dept1', sales: 600 }]),
      categoryDailyPrevSeries: makeSeries([{ code: 'D1', name: 'Dept1', sales: 500 }]),
    })
    // lane totals used as anchors, so running = anchorCur exactly
    expect(Math.abs(result.residual)).toBeLessThan(1)
  })
})
