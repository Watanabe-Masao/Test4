/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { buildDepartmentKpiIndex, EMPTY_DEPT_KPI_INDEX } from './indexBuilder'
import type { DepartmentKpiRecord, DepartmentKpiData } from '@/domain/models/record'

function makeRecord(overrides: Partial<DepartmentKpiRecord> = {}): DepartmentKpiRecord {
  return {
    deptCode: '01',
    deptName: '青果',
    gpRateBudget: 0.25,
    gpRateActual: 0.22,
    gpRateVariance: -0.03,
    markupRate: 0.3,
    discountRate: 0.05,
    salesBudget: 10_000_000,
    salesActual: 9_500_000,
    salesVariance: -500_000,
    salesAchievement: 0.95,
    openingInventory: 2_000_000,
    closingInventory: 1_800_000,
    gpRateLanding: 0.23,
    salesLanding: 11_000_000,
    ...overrides,
  }
}

function makeData(records: DepartmentKpiRecord[]): DepartmentKpiData {
  return { records }
}

describe('indexBuilder', () => {
  describe('EMPTY_DEPT_KPI_INDEX', () => {
    it('空のインデックスが正しい初期値を持つ', () => {
      expect(EMPTY_DEPT_KPI_INDEX.byDeptCode.size).toBe(0)
      expect(EMPTY_DEPT_KPI_INDEX.records).toHaveLength(0)
      expect(EMPTY_DEPT_KPI_INDEX.summary.deptCount).toBe(0)
      expect(EMPTY_DEPT_KPI_INDEX.summary.totalSalesBudget).toBe(0)
      expect(EMPTY_DEPT_KPI_INDEX.summary.totalSalesActual).toBe(0)
      expect(EMPTY_DEPT_KPI_INDEX.gpRateRanking).toHaveLength(0)
      expect(EMPTY_DEPT_KPI_INDEX.salesAchievementRanking).toHaveLength(0)
    })
  })

  describe('buildDepartmentKpiIndex', () => {
    it('空の records で EMPTY_DEPT_KPI_INDEX を返す', () => {
      const index = buildDepartmentKpiIndex(makeData([]))
      expect(index).toBe(EMPTY_DEPT_KPI_INDEX)
    })

    it('単一レコードで正しくインデックスを構築する', () => {
      const rec = makeRecord({ deptCode: '01', salesActual: 5_000_000, salesBudget: 6_000_000 })
      const index = buildDepartmentKpiIndex(makeData([rec]))

      expect(index.records).toHaveLength(1)
      expect(index.byDeptCode.size).toBe(1)
      expect(index.byDeptCode.get('01')).toBe(rec)
      expect(index.summary.deptCount).toBe(1)
      expect(index.summary.totalSalesActual).toBe(5_000_000)
      expect(index.summary.totalSalesBudget).toBe(6_000_000)
    })

    it('複数レコードの売上合計が正しい', () => {
      const records = [
        makeRecord({ deptCode: '01', salesBudget: 10_000_000, salesActual: 9_000_000 }),
        makeRecord({ deptCode: '02', salesBudget: 8_000_000, salesActual: 8_500_000 }),
        makeRecord({ deptCode: '03', salesBudget: 5_000_000, salesActual: 4_000_000 }),
      ]
      const index = buildDepartmentKpiIndex(makeData(records))

      expect(index.summary.deptCount).toBe(3)
      expect(index.summary.totalSalesBudget).toBe(23_000_000)
      expect(index.summary.totalSalesActual).toBe(21_500_000)
    })

    it('全体売上達成率が正しく計算される', () => {
      const records = [
        makeRecord({ deptCode: '01', salesBudget: 10_000_000, salesActual: 9_000_000 }),
        makeRecord({ deptCode: '02', salesBudget: 10_000_000, salesActual: 11_000_000 }),
      ]
      const index = buildDepartmentKpiIndex(makeData(records))

      // 実績合計 20_000_000 / 予算合計 20_000_000 = 1.0
      expect(index.summary.overallSalesAchievement).toBe(1.0)
    })

    it('予算合計が0の場合、達成率は0を返す', () => {
      const records = [makeRecord({ deptCode: '01', salesBudget: 0, salesActual: 5_000_000 })]
      const index = buildDepartmentKpiIndex(makeData(records))

      expect(index.summary.overallSalesAchievement).toBe(0)
    })

    it('売上加重平均粗利率（実績）が正しく計算される', () => {
      // dept01: gpRateActual=0.20, salesActual=6_000_000
      // dept02: gpRateActual=0.30, salesActual=4_000_000
      // 加重平均 = (0.20*6M + 0.30*4M) / (6M+4M) = (1.2M+1.2M)/10M = 0.24
      const records = [
        makeRecord({ deptCode: '01', gpRateActual: 0.2, salesActual: 6_000_000 }),
        makeRecord({ deptCode: '02', gpRateActual: 0.3, salesActual: 4_000_000 }),
      ]
      const index = buildDepartmentKpiIndex(makeData(records))

      expect(index.summary.weightedGpRateActual).toBeCloseTo(0.24, 6)
    })

    it('売上加重平均粗利率（予算）が正しく計算される', () => {
      const records = [
        makeRecord({ deptCode: '01', gpRateBudget: 0.25, salesActual: 3_000_000 }),
        makeRecord({ deptCode: '02', gpRateBudget: 0.35, salesActual: 7_000_000 }),
      ]
      const index = buildDepartmentKpiIndex(makeData(records))

      // (0.25*3M + 0.35*7M) / 10M = (0.75M + 2.45M) / 10M = 0.32
      expect(index.summary.weightedGpRateBudget).toBeCloseTo(0.32, 6)
    })

    it('売上実績合計が0の場合、加重平均率は0を返す', () => {
      const records = [makeRecord({ deptCode: '01', salesActual: 0, gpRateActual: 0.25 })]
      const index = buildDepartmentKpiIndex(makeData(records))

      expect(index.summary.weightedGpRateActual).toBe(0)
      expect(index.summary.weightedGpRateBudget).toBe(0)
      expect(index.summary.weightedDiscountRate).toBe(0)
      expect(index.summary.weightedMarkupRate).toBe(0)
    })

    it('売上加重平均売変率が正しく計算される', () => {
      const records = [
        makeRecord({ deptCode: '01', discountRate: 0.04, salesActual: 5_000_000 }),
        makeRecord({ deptCode: '02', discountRate: 0.08, salesActual: 5_000_000 }),
      ]
      const index = buildDepartmentKpiIndex(makeData(records))

      // (0.04*5M + 0.08*5M) / 10M = 0.06
      expect(index.summary.weightedDiscountRate).toBeCloseTo(0.06, 6)
    })

    it('売上加重平均値入率が正しく計算される', () => {
      const records = [
        makeRecord({ deptCode: '01', markupRate: 0.28, salesActual: 8_000_000 }),
        makeRecord({ deptCode: '02', markupRate: 0.35, salesActual: 2_000_000 }),
      ]
      const index = buildDepartmentKpiIndex(makeData(records))

      // (0.28*8M + 0.35*2M) / 10M = (2.24M + 0.7M) / 10M = 0.294
      expect(index.summary.weightedMarkupRate).toBeCloseTo(0.294, 6)
    })

    it('byDeptCode マップで各レコードを検索できる', () => {
      const records = [
        makeRecord({ deptCode: '01', deptName: '青果' }),
        makeRecord({ deptCode: '02', deptName: '鮮魚' }),
        makeRecord({ deptCode: '03', deptName: '精肉' }),
      ]
      const index = buildDepartmentKpiIndex(makeData(records))

      expect(index.byDeptCode.get('01')?.deptName).toBe('青果')
      expect(index.byDeptCode.get('02')?.deptName).toBe('鮮魚')
      expect(index.byDeptCode.get('03')?.deptName).toBe('精肉')
      expect(index.byDeptCode.get('99')).toBeUndefined()
    })

    it('粗利率実績の降順ランキングが正しい', () => {
      const records = [
        makeRecord({ deptCode: '01', gpRateActual: 0.2 }),
        makeRecord({ deptCode: '02', gpRateActual: 0.3 }),
        makeRecord({ deptCode: '03', gpRateActual: 0.25 }),
      ]
      const index = buildDepartmentKpiIndex(makeData(records))

      expect(index.gpRateRanking).toEqual(['02', '03', '01'])
    })

    it('売上達成率の降順ランキングが正しい', () => {
      const records = [
        makeRecord({ deptCode: '01', salesAchievement: 0.95 }),
        makeRecord({ deptCode: '02', salesAchievement: 1.1 }),
        makeRecord({ deptCode: '03', salesAchievement: 1.02 }),
      ]
      const index = buildDepartmentKpiIndex(makeData(records))

      expect(index.salesAchievementRanking).toEqual(['02', '03', '01'])
    })

    it('records の順序が元データと同じ', () => {
      const records = [
        makeRecord({ deptCode: '03' }),
        makeRecord({ deptCode: '01' }),
        makeRecord({ deptCode: '02' }),
      ]
      const index = buildDepartmentKpiIndex(makeData(records))

      expect(index.records.map((r) => r.deptCode)).toEqual(['03', '01', '02'])
    })

    it('同一 deptCode が複数ある場合、後のレコードで上書きされる', () => {
      const records = [
        makeRecord({ deptCode: '01', deptName: '青果（旧）' }),
        makeRecord({ deptCode: '01', deptName: '青果（新）' }),
      ]
      const index = buildDepartmentKpiIndex(makeData(records))

      expect(index.byDeptCode.get('01')?.deptName).toBe('青果（新）')
      // records は全件保持
      expect(index.records).toHaveLength(2)
    })
  })
})
