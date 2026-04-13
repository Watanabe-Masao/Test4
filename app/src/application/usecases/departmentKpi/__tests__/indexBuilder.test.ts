/**
 * buildDepartmentKpiIndex のユニットテスト
 *
 * 集約計算（加重平均粗利率、売上合計）・ランキング・空入力の動作を検証する。
 */
import { describe, it, expect } from 'vitest'
import {
  buildDepartmentKpiIndex,
  EMPTY_DEPT_KPI_INDEX,
} from '@/application/usecases/departmentKpi/indexBuilder'
import type { DepartmentKpiRecord, DepartmentKpiData } from '@/domain/models/record'

const rec = (overrides: Partial<DepartmentKpiRecord>): DepartmentKpiRecord => ({
  deptCode: '001',
  deptName: 'Dept A',
  gpRateBudget: 0.25,
  gpRateActual: 0.23,
  gpRateVariance: -0.02,
  markupRate: 0.3,
  discountRate: 0.02,
  salesBudget: 1_000_000,
  salesActual: 900_000,
  salesVariance: -100_000,
  salesAchievement: 0.9,
  openingInventory: 0,
  closingInventory: 0,
  gpRateLanding: 0.23,
  salesLanding: 900_000,
  ...overrides,
})

describe('buildDepartmentKpiIndex', () => {
  it('空レコードは EMPTY_DEPT_KPI_INDEX を返す', () => {
    const result = buildDepartmentKpiIndex({ records: [] })
    expect(result).toBe(EMPTY_DEPT_KPI_INDEX)
    expect(result.summary.deptCount).toBe(0)
    expect(result.summary.totalSalesActual).toBe(0)
    expect(result.gpRateRanking).toEqual([])
  })

  it('単一レコードのサマリを計算する', () => {
    const data: DepartmentKpiData = {
      records: [
        rec({
          deptCode: 'A',
          salesBudget: 1000,
          salesActual: 900,
          gpRateActual: 0.25,
          gpRateBudget: 0.3,
          discountRate: 0.02,
          markupRate: 0.3,
        }),
      ],
    }
    const result = buildDepartmentKpiIndex(data)
    expect(result.summary.deptCount).toBe(1)
    expect(result.summary.totalSalesBudget).toBe(1000)
    expect(result.summary.totalSalesActual).toBe(900)
    expect(result.summary.overallSalesAchievement).toBe(0.9)
    // weighted sum / totalSalesActual (= 1 dept → raw value)
    expect(result.summary.weightedGpRateActual).toBeCloseTo(0.25, 10)
    expect(result.summary.weightedGpRateBudget).toBeCloseTo(0.3, 10)
    expect(result.summary.weightedDiscountRate).toBeCloseTo(0.02, 10)
    expect(result.summary.weightedMarkupRate).toBeCloseTo(0.3, 10)
  })

  it('byDeptCode マップに deptCode でアクセスできる', () => {
    const data: DepartmentKpiData = {
      records: [
        rec({ deptCode: 'A', deptName: 'Alpha' }),
        rec({ deptCode: 'B', deptName: 'Beta' }),
      ],
    }
    const result = buildDepartmentKpiIndex(data)
    expect(result.byDeptCode.size).toBe(2)
    expect(result.byDeptCode.get('A')?.deptName).toBe('Alpha')
    expect(result.byDeptCode.get('B')?.deptName).toBe('Beta')
  })

  it('加重平均粗利率を売上実績で重み付けする', () => {
    // A: salesActual=100, gp=0.1 → weighted=10
    // B: salesActual=900, gp=0.3 → weighted=270
    // total=1000, weighted=280, avg=0.28
    const data: DepartmentKpiData = {
      records: [
        rec({ deptCode: 'A', salesActual: 100, gpRateActual: 0.1 }),
        rec({ deptCode: 'B', salesActual: 900, gpRateActual: 0.3 }),
      ],
    }
    const result = buildDepartmentKpiIndex(data)
    expect(result.summary.totalSalesActual).toBe(1000)
    expect(result.summary.weightedGpRateActual).toBeCloseTo(0.28, 10)
  })

  it('gpRateRanking を gpRateActual 降順で返す', () => {
    const data: DepartmentKpiData = {
      records: [
        rec({ deptCode: 'A', gpRateActual: 0.2 }),
        rec({ deptCode: 'B', gpRateActual: 0.35 }),
        rec({ deptCode: 'C', gpRateActual: 0.25 }),
      ],
    }
    const result = buildDepartmentKpiIndex(data)
    expect(result.gpRateRanking).toEqual(['B', 'C', 'A'])
  })

  it('salesAchievementRanking を salesAchievement 降順で返す', () => {
    const data: DepartmentKpiData = {
      records: [
        rec({ deptCode: 'A', salesAchievement: 0.8 }),
        rec({ deptCode: 'B', salesAchievement: 1.1 }),
        rec({ deptCode: 'C', salesAchievement: 0.95 }),
      ],
    }
    const result = buildDepartmentKpiIndex(data)
    expect(result.salesAchievementRanking).toEqual(['B', 'C', 'A'])
  })

  it('deptCount が records 数に一致する', () => {
    const data: DepartmentKpiData = {
      records: [rec({ deptCode: '1' }), rec({ deptCode: '2' }), rec({ deptCode: '3' })],
    }
    const result = buildDepartmentKpiIndex(data)
    expect(result.summary.deptCount).toBe(3)
  })

  it('totalSalesActual=0 なら加重平均は 0', () => {
    const data: DepartmentKpiData = {
      records: [
        rec({ deptCode: 'A', salesActual: 0, gpRateActual: 0.3 }),
        rec({ deptCode: 'B', salesActual: 0, gpRateActual: 0.4 }),
      ],
    }
    const result = buildDepartmentKpiIndex(data)
    expect(result.summary.totalSalesActual).toBe(0)
    // safeDivide fallback
    expect(result.summary.weightedGpRateActual).toBe(0)
    expect(result.summary.weightedDiscountRate).toBe(0)
  })
})

describe('EMPTY_DEPT_KPI_INDEX', () => {
  it('全フィールドがデフォルト値', () => {
    expect(EMPTY_DEPT_KPI_INDEX.records).toEqual([])
    expect(EMPTY_DEPT_KPI_INDEX.byDeptCode.size).toBe(0)
    expect(EMPTY_DEPT_KPI_INDEX.gpRateRanking).toEqual([])
    expect(EMPTY_DEPT_KPI_INDEX.salesAchievementRanking).toEqual([])
    expect(EMPTY_DEPT_KPI_INDEX.summary.deptCount).toBe(0)
  })
})
