/**
 * ForecastChartsCustomer.vm.ts — pure ViewModel builders tests
 */
import { describe, it, expect } from 'vitest'
import {
  buildDowCustomerChartViewModel,
  buildMovingAverageChartData,
  buildRelationshipChartViewModel,
  buildCustomerSalesScatterData,
  buildSameDowComparisonData,
} from '../ForecastChartsCustomer.vm'
import type {
  DowCustomerAvg,
  MovingAvgEntry,
  DailyCustomerEntry,
  RelationshipEntry,
} from '../ForecastPage.helpers'

const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#06b6d4', '#ec4899']

function makeAvg(partial: Partial<DowCustomerAvg> & { dow: string }): DowCustomerAvg {
  return {
    dow: partial.dow,
    avgCustomers: partial.avgCustomers ?? 0,
    avgTxValue: partial.avgTxValue ?? 0,
    prevAvgCustomers: partial.prevAvgCustomers ?? 0,
    prevAvgTxValue: partial.prevAvgTxValue ?? 0,
    count: partial.count ?? 0,
  }
}

describe('buildDowCustomerChartViewModel', () => {
  it('hasPrev=false のとき前年フィールドを含めない', () => {
    const averages: DowCustomerAvg[] = [
      makeAvg({ dow: '日', avgCustomers: 10, avgTxValue: 100 }),
      makeAvg({ dow: '月', avgCustomers: 20, avgTxValue: 200 }),
    ]
    const vm = buildDowCustomerChartViewModel(averages, COLORS)
    expect(vm.hasPrev).toBe(false)
    expect(vm.data).toHaveLength(2)
    expect(vm.data[0]).toEqual({
      name: '日',
      今年客数: 10,
      今年客単価: 100,
      color: '#ef4444',
    })
    expect('前年客数' in vm.data[0]).toBe(false)
  })

  it('hasPrev=true のとき前年フィールドを含める', () => {
    const averages: DowCustomerAvg[] = [
      makeAvg({
        dow: '日',
        avgCustomers: 10,
        avgTxValue: 100,
        prevAvgCustomers: 8,
        prevAvgTxValue: 90,
      }),
    ]
    const vm = buildDowCustomerChartViewModel(averages, COLORS)
    expect(vm.hasPrev).toBe(true)
    expect(vm.data[0]).toMatchObject({
      name: '日',
      今年客数: 10,
      前年客数: 8,
      今年客単価: 100,
      前年客単価: 90,
      color: '#ef4444',
    })
  })

  it('空入力は空 data と hasPrev=false', () => {
    const vm = buildDowCustomerChartViewModel([], COLORS)
    expect(vm.data).toEqual([])
    expect(vm.hasPrev).toBe(false)
  })
})

describe('buildMovingAverageChartData', () => {
  const entries: MovingAvgEntry[] = [
    {
      day: 1,
      salesMA: 1000,
      customersMA: 10,
      txValueMA: 100,
      prevSalesMA: 800,
      prevCustomersMA: 8,
      prevTxValueMA: 100,
    },
    {
      day: 2,
      salesMA: 1200,
      customersMA: 12,
      txValueMA: 100,
      prevSalesMA: 900,
      prevCustomersMA: 9,
      prevTxValueMA: 100,
    },
  ]

  it('hasPrev=false のとき前年フィールドを省略', () => {
    const data = buildMovingAverageChartData(entries, false)
    expect(data).toHaveLength(2)
    expect(data[0]).toEqual({ day: '1', 客数MA: 10, 客単価MA: 100 })
    expect('前年客数MA' in data[0]).toBe(false)
  })

  it('hasPrev=true のとき前年フィールドを含める', () => {
    const data = buildMovingAverageChartData(entries, true)
    expect(data[0]).toEqual({
      day: '1',
      客数MA: 10,
      客単価MA: 100,
      前年客数MA: 8,
      前年客単価MA: 100,
    })
  })

  it('空配列は空配列', () => {
    expect(buildMovingAverageChartData([], true)).toEqual([])
  })
})

describe('buildRelationshipChartViewModel', () => {
  const cur: RelationshipEntry[] = [
    {
      day: 1,
      sales: 1000,
      customers: 10,
      txValue: 100,
      salesIndex: 1.0,
      customersIndex: 1.2,
      txValueIndex: 0.85,
    },
    {
      day: 2,
      sales: 1500,
      customers: 15,
      txValue: 100,
      salesIndex: 1.5,
      customersIndex: 1.8,
      txValueIndex: 0.9,
    },
  ]
  const prev: RelationshipEntry[] = [
    {
      day: 1,
      sales: 900,
      customers: 9,
      txValue: 100,
      salesIndex: 0.9,
      customersIndex: 1.1,
      txValueIndex: 0.8,
    },
  ]

  it('viewMode=current: 今年のみ、前年キーなし', () => {
    const vm = buildRelationshipChartViewModel(cur, prev, 'current')
    expect(vm.showCurrent).toBe(true)
    expect(vm.showPrev).toBe(false)
    expect(vm.title).toContain('今年')
    expect(vm.chartData).toHaveLength(2)
    expect(vm.chartData[0]).toMatchObject({
      day: '1',
      売上指数: 100,
      客数指数: 120,
      客単価指数: 85,
    })
    expect('前年売上指数' in vm.chartData[0]).toBe(false)
  })

  it('viewMode=prev: 前年のみ', () => {
    const vm = buildRelationshipChartViewModel(cur, prev, 'prev')
    expect(vm.showCurrent).toBe(false)
    expect(vm.showPrev).toBe(true)
    expect(vm.title).toContain('前年')
    expect(vm.chartData).toHaveLength(1)
    expect(vm.chartData[0]).toMatchObject({
      day: '1',
      前年売上指数: 90,
      前年客数指数: 110,
      前年客単価指数: 80,
    })
  })

  it('viewMode=compare: 今年+前年をマージ、日付昇順', () => {
    const vm = buildRelationshipChartViewModel(cur, prev, 'compare')
    expect(vm.showCurrent).toBe(true)
    expect(vm.showPrev).toBe(true)
    expect(vm.title).toContain('今年 vs 前年')
    expect(vm.chartData).toHaveLength(2)
    // day=1 has both cur+prev, day=2 has cur only
    expect(vm.chartData[0]).toMatchObject({
      day: '1',
      売上指数: 100,
      前年売上指数: 90,
    })
    expect(vm.chartData[1]).toMatchObject({
      day: '2',
      売上指数: 150,
    })
    expect('前年売上指数' in vm.chartData[1]).toBe(false)
  })

  it('prev データが空の場合は compare でも showPrev=false', () => {
    const vm = buildRelationshipChartViewModel(cur, [], 'compare')
    expect(vm.showPrev).toBe(false)
  })
})

describe('buildCustomerSalesScatterData', () => {
  it('customers>0 のみ通し、正しく文字列化', () => {
    const entries: DailyCustomerEntry[] = [
      {
        day: 1,
        sales: 1000,
        customers: 10,
        txValue: 100,
        prevCustomers: 0,
        prevSales: 0,
        prevTxValue: 0,
      },
      {
        day: 2,
        sales: 500,
        customers: 0,
        txValue: 0,
        prevCustomers: 0,
        prevSales: 0,
        prevTxValue: 0,
      },
    ]
    const result = buildCustomerSalesScatterData(entries)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({ day: '1', 売上: 1000, 客数: 10, 客単価: 100 })
  })

  it('空配列は空配列', () => {
    expect(buildCustomerSalesScatterData([])).toEqual([])
  })
})

describe('buildSameDowComparisonData', () => {
  it('今年・前年どちらも customers>0 のみ通し、曜日ラベル付与', () => {
    // 2026-01-01 は木曜
    const entries: DailyCustomerEntry[] = [
      {
        day: 1,
        sales: 1000,
        customers: 10,
        txValue: 100,
        prevCustomers: 9,
        prevSales: 900,
        prevTxValue: 100,
      },
      {
        day: 2,
        sales: 1100,
        customers: 11,
        txValue: 100,
        prevCustomers: 0,
        prevSales: 0,
        prevTxValue: 0,
      },
    ]
    const result = buildSameDowComparisonData(entries, 2026, 1, COLORS)
    expect(result).toHaveLength(1)
    expect(result[0].day).toBe('1(木)')
    expect(result[0]).toMatchObject({
      今年客数: 10,
      前年客数: 9,
      今年客単価: 100,
      前年客単価: 100,
    })
    // 木曜 index = 4
    expect(result[0].color).toBe(COLORS[4])
  })

  it('今年 0 でも除外', () => {
    const entries: DailyCustomerEntry[] = [
      {
        day: 1,
        sales: 0,
        customers: 0,
        txValue: 0,
        prevCustomers: 9,
        prevSales: 900,
        prevTxValue: 100,
      },
    ]
    expect(buildSameDowComparisonData(entries, 2026, 1, COLORS)).toEqual([])
  })
})
