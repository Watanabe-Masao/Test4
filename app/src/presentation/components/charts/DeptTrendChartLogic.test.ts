import { describe, it, expect } from 'vitest'
import { buildDeptTrendData } from './DeptTrendChartLogic'
import type { DeptKpiMonthlyTrendRow } from '@/application/hooks/duckdb'

const rows = [
  {
    deptCode: 'D1',
    deptName: 'Fresh',
    year: 2025,
    month: 1,
    gpRateActual: 0.25,
    salesActual: 1000.6,
  },
  {
    deptCode: 'D2',
    deptName: 'Grocery',
    year: 2025,
    month: 1,
    gpRateActual: 0.18,
    salesActual: 2500,
  },
  {
    deptCode: 'D1',
    deptName: 'Fresh',
    year: 2025,
    month: 2,
    gpRateActual: 0.3,
    salesActual: 1200,
  },
] as unknown as DeptKpiMonthlyTrendRow[]

describe('buildDeptTrendData', () => {
  it('builds chartData and deptNames map when no selected dept', () => {
    const result = buildDeptTrendData(rows, null)
    expect(result.deptNames.get('D1')).toBe('Fresh')
    expect(result.deptNames.get('D2')).toBe('Grocery')
    expect(result.chartData).toHaveLength(2)

    const jan = result.chartData.find((d) => d.label === '2025/01')!
    // 0.25 * 10000 / 100 = 25
    expect(jan.gpRate_D1).toBe(25)
    expect(jan.sales_D1).toBe(1001)
    expect(jan.gpRate_D2).toBe(18)
    expect(jan.sales_D2).toBe(2500)

    const feb = result.chartData.find((d) => d.label === '2025/02')!
    expect(feb.gpRate_D1).toBe(30)
    expect(feb.sales_D1).toBe(1200)
  })

  it('includes only selected dept entries when filtering', () => {
    const result = buildDeptTrendData(rows, 'D1')
    const jan = result.chartData.find((d) => d.label === '2025/01')!
    expect(jan.gpRate_D1).toBe(25)
    expect(jan.gpRate_D2).toBeUndefined()
  })

  it('returns empty chartData for empty input', () => {
    const result = buildDeptTrendData([], null)
    expect(result.chartData).toEqual([])
    expect(result.deptNames.size).toBe(0)
  })

  it('sorts chartData by year/month ascending', () => {
    const mixed = [
      { deptCode: 'A', deptName: 'A', year: 2025, month: 3, gpRateActual: 0.1, salesActual: 100 },
      { deptCode: 'A', deptName: 'A', year: 2025, month: 1, gpRateActual: 0.2, salesActual: 200 },
      { deptCode: 'A', deptName: 'A', year: 2024, month: 12, gpRateActual: 0.3, salesActual: 300 },
    ] as unknown as DeptKpiMonthlyTrendRow[]
    const result = buildDeptTrendData(mixed, null)
    expect(result.chartData.map((d) => d.label)).toEqual(['2024/12', '2025/01', '2025/03'])
  })
})
