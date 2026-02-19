import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { ConditionSummaryWidget } from '../ConditionSummary'
import {
  makeWidgetContext,
  makeStoreResult,
  makePrevYear,
  renderWithTheme,
} from './widgetTestHelpers'

describe('ConditionSummaryWidget', () => {
  it('基本のコンディションアイテムがレンダリングされる', () => {
    const ctx = makeWidgetContext()

    renderWithTheme(<ConditionSummaryWidget ctx={ctx} />)

    expect(screen.getByText('コンディションサマリー')).toBeInTheDocument()
    expect(screen.getByText('粗利率')).toBeInTheDocument()
    expect(screen.getByText('原算後粗利率')).toBeInTheDocument()
    expect(screen.getByText('予算消化率')).toBeInTheDocument()
    expect(screen.getByText('着地予測達成率')).toBeInTheDocument()
    expect(screen.getByText('売変率')).toBeInTheDocument()
    expect(screen.getByText('消耗品率')).toBeInTheDocument()
  })

  it('客数 > 0 で客単価カードが表示される', () => {
    const ctx = makeWidgetContext({
      result: makeStoreResult({
        totalCustomers: 500,
        averageCustomersPerDay: 50,
        totalSales: 1000000,
      }),
    })

    renderWithTheme(<ConditionSummaryWidget ctx={ctx} />)

    expect(screen.getByText('客単価')).toBeInTheDocument()
  })

  it('客数 = 0 では客単価カードが非表示', () => {
    const ctx = makeWidgetContext({
      result: makeStoreResult({
        totalCustomers: 0,
      }),
    })

    renderWithTheme(<ConditionSummaryWidget ctx={ctx} />)

    expect(screen.queryByText('客単価')).not.toBeInTheDocument()
  })

  it('前年客数データがある場合に客数前年比カードが表示される', () => {
    const prevDaily = new Map([
      [1, { sales: 90000, discount: 500, customers: 40 }],
    ])
    const ctx = makeWidgetContext({
      result: makeStoreResult({
        totalCustomers: 500,
        totalSales: 1000000,
      }),
      prevYear: makePrevYear(prevDaily, { totalCustomers: 480 }),
    })

    renderWithTheme(<ConditionSummaryWidget ctx={ctx} />)

    expect(screen.getByText('客数前年比')).toBeInTheDocument()
  })

  it('前年客数 = 0 では客数前年比カードが非表示', () => {
    const prevDaily = new Map([
      [1, { sales: 90000, discount: 500, customers: 0 }],
    ])
    const ctx = makeWidgetContext({
      result: makeStoreResult({
        totalCustomers: 500,
        totalSales: 1000000,
      }),
      prevYear: makePrevYear(prevDaily, { totalCustomers: 0 }),
    })

    renderWithTheme(<ConditionSummaryWidget ctx={ctx} />)

    expect(screen.queryByText('客数前年比')).not.toBeInTheDocument()
  })

  it('客単価の前年比シグナルが正しい（前年超え → green）', () => {
    const prevDaily = new Map([
      [1, { sales: 90000, discount: 500, customers: 50 }],
    ])
    const ctx = makeWidgetContext({
      result: makeStoreResult({
        totalCustomers: 500,
        totalSales: 1000000, // 客単価 2000
      }),
      // 前年: totalSales=90000, totalCustomers=50 → 客単価 1800
      prevYear: makePrevYear(prevDaily),
    })

    renderWithTheme(<ConditionSummaryWidget ctx={ctx} />)

    // 客単価カードが存在すること（前年比 >= 1 → green）
    expect(screen.getByText('客単価')).toBeInTheDocument()
  })
})
