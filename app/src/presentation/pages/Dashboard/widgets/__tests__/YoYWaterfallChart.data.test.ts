import { describe, it, expect } from 'vitest'
import {
  DECOMP_HELP,
  buildCategoryData,
} from '@/presentation/pages/Dashboard/widgets/YoYWaterfallChart.data'
import type { CategoryTimeSalesRecord } from '@/domain/models/record'

const rec = (dept: string, name: string, amount: number): CategoryTimeSalesRecord =>
  ({
    department: { code: dept, name },
    line: { code: 'L', name: 'L' },
    klass: { code: 'K', name: 'K' },
    totalAmount: amount,
    totalQuantity: 0,
  }) as unknown as CategoryTimeSalesRecord

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

describe('buildCategoryData', () => {
  const baseParams = {
    hasComparison: true,
    prevSales: 1000,
    curSales: 1100,
    prevLabel: '前年',
    curLabel: '当年',
  }

  it('returns empty result when periodCTS is empty', () => {
    const result = buildCategoryData({
      ...baseParams,
      periodCTS: [],
      periodPrevCTS: [rec('D1', 'Dept1', 500)],
    })
    expect(result.items).toEqual([])
    expect(result.residual).toBe(0)
    expect(result.residualPct).toBe(0)
  })

  it('returns empty result when periodPrevCTS is empty', () => {
    const result = buildCategoryData({
      ...baseParams,
      periodCTS: [rec('D1', 'Dept1', 500)],
      periodPrevCTS: [],
    })
    expect(result.items).toEqual([])
  })

  it('returns empty when hasComparison is false', () => {
    const result = buildCategoryData({
      ...baseParams,
      hasComparison: false,
      periodCTS: [rec('D1', 'Dept1', 600)],
      periodPrevCTS: [rec('D1', 'Dept1', 500)],
    })
    expect(result.items).toEqual([])
  })

  it('returns empty when prevSales <= 0', () => {
    const result = buildCategoryData({
      ...baseParams,
      prevSales: 0,
      periodCTS: [rec('D1', 'Dept1', 600)],
      periodPrevCTS: [rec('D1', 'Dept1', 500)],
    })
    expect(result.items).toEqual([])
  })

  it('builds items with start and end anchors', () => {
    const result = buildCategoryData({
      ...baseParams,
      periodCTS: [rec('D1', 'Dept1', 600), rec('D2', 'Dept2', 500)],
      periodPrevCTS: [rec('D1', 'Dept1', 500), rec('D2', 'Dept2', 500)],
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
      periodCTS: [rec('D1', 'Dept1', 700)],
      periodPrevCTS: [rec('D1', 'Dept1', 500)],
    })
    const deptItem = result.items.find((i) => i.name === 'Dept1')
    expect(deptItem?.value).toBe(200)
    expect(deptItem?.bar).toBe(200)
  })

  it('sorts department items by absolute diff descending', () => {
    const result = buildCategoryData({
      ...baseParams,
      periodCTS: [
        rec('D1', 'Dept1', 600), // +100
        rec('D2', 'Dept2', 500), // +300
        rec('D3', 'Dept3', 300), // -200
      ],
      periodPrevCTS: [rec('D1', 'Dept1', 500), rec('D2', 'Dept2', 200), rec('D3', 'Dept3', 500)],
    })
    const deptItems = result.items.filter((i) => !i.isTotal && i.name !== '調整')
    // Largest abs diff should come first: D2 (+300), D3 (-200), D1 (+100)
    expect(deptItems[0].name).toBe('Dept2')
    expect(deptItems[1].name).toBe('Dept3')
    expect(deptItems[2].name).toBe('Dept1')
  })

  it('groups remaining depts as "その他" when more than 8', () => {
    const periodCTS: CategoryTimeSalesRecord[] = []
    const periodPrevCTS: CategoryTimeSalesRecord[] = []
    for (let i = 0; i < 10; i++) {
      periodCTS.push(rec(`D${i}`, `Dept${i}`, 100 + i * 10))
      periodPrevCTS.push(rec(`D${i}`, `Dept${i}`, 100))
    }
    const result = buildCategoryData({
      ...baseParams,
      prevSales: 1000,
      curSales: 1450,
      periodCTS,
      periodPrevCTS,
    })
    const otherItem = result.items.find((i) => i.name.startsWith('その他'))
    expect(otherItem).toBeTruthy()
    expect(otherItem?.name).toContain('部門')
  })

  it('residual is near zero when anchors match', () => {
    const result = buildCategoryData({
      ...baseParams,
      periodCTS: [rec('D1', 'Dept1', 600)],
      periodPrevCTS: [rec('D1', 'Dept1', 500)],
    })
    // cts totals used as anchors, so running = anchorCur exactly
    expect(Math.abs(result.residual)).toBeLessThan(1)
  })
})
