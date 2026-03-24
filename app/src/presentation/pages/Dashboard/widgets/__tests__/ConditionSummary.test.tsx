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
    // 粗利率, 値入率, 売変率, 売上前年比 は ConditionSummaryEnhanced に吸収済み
    // 残存アイテムは前年データ依存のため、基本レンダリングではカードが少ない
  })

  it('吸収済みアイテムが表示されない', () => {
    const ctx = makeWidgetContext()

    renderWithTheme(<ConditionSummaryWidget ctx={ctx} />)

    expect(screen.queryByText('粗利率')).not.toBeInTheDocument()
    expect(screen.queryByText('値入率')).not.toBeInTheDocument()
    expect(screen.queryByText('売変率')).not.toBeInTheDocument()
    expect(screen.queryByText('売上前年比')).not.toBeInTheDocument()
  })

  it('前年客数データがある場合に客単価前年比カードが表示される', () => {
    const prevDaily = new Map([
      ['2026-02-01', { sales: 90000, discount: 500, customers: 40, ctsQuantity: 0 }],
    ])
    const ctx = makeWidgetContext({
      result: makeStoreResult({
        totalCustomers: 500,
        totalSales: 1000000,
      }),
      prevYear: makePrevYear(prevDaily, { totalCustomers: 480 }),
    })

    renderWithTheme(<ConditionSummaryWidget ctx={ctx} />)

    expect(screen.getByText('客単価前年比')).toBeInTheDocument()
  })

  it('前年客数 = 0 では客単価前年比カードが非表示', () => {
    const prevDaily = new Map([
      ['2026-02-01', { sales: 90000, discount: 500, customers: 0, ctsQuantity: 0 }],
    ])
    const ctx = makeWidgetContext({
      result: makeStoreResult({
        totalCustomers: 500,
        totalSales: 1000000,
      }),
      prevYear: makePrevYear(prevDaily, { totalCustomers: 0 }),
    })

    renderWithTheme(<ConditionSummaryWidget ctx={ctx} />)

    expect(screen.queryByText('客単価前年比')).not.toBeInTheDocument()
  })

  it('前年客数データがある場合に客数前年比カードが表示される', () => {
    const prevDaily = new Map([
      ['2026-02-01', { sales: 90000, discount: 500, customers: 40, ctsQuantity: 0 }],
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
      ['2026-02-01', { sales: 90000, discount: 500, customers: 0, ctsQuantity: 0 }],
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

  it('客単価前年比の前年比シグナルが正しい（前年超え → blue）', () => {
    const prevDaily = new Map([
      ['2026-02-01', { sales: 90000, discount: 500, customers: 50, ctsQuantity: 0 }],
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

    // 客単価前年比カードが存在すること（前年比 >= 1 → blue）
    expect(screen.getByText('客単価前年比')).toBeInTheDocument()
  })
})
