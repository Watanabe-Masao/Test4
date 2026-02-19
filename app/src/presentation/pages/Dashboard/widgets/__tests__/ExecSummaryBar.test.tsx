import { describe, it, expect } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { WIDGET_MAP } from '../registry'
import {
  makeWidgetContext,
  makeStoreResult,
  makePrevYear,
  renderWithTheme,
} from './widgetTestHelpers'

describe('ExecSummaryBar ウィジェット', () => {
  const widget = WIDGET_MAP.get('exec-summary-bar')!

  it('ウィジェットが登録されている', () => {
    expect(widget).toBeDefined()
    expect(widget.id).toBe('exec-summary-bar')
    expect(widget.size).toBe('full')
  })

  it('売上・予算タブがデフォルトで売上実績セクションを表示する', () => {
    const ctx = makeWidgetContext({
      result: makeStoreResult({
        totalSales: 1500000,
        budget: 3000000,
        dailyCumulative: new Map([[15, { sales: 1500000, budget: 1500000 }]]),
        elapsedDays: 15,
      }),
    })

    const el = widget.render(ctx)
    renderWithTheme(<>{el}</>)

    expect(screen.getByText('売上実績（営業日）')).toBeInTheDocument()
    expect(screen.getByText('売上消化率（月間）')).toBeInTheDocument()
  })

  it('客数・客単価タブに切り替えると客数情報が表示される', () => {
    const ctx = makeWidgetContext({
      result: makeStoreResult({
        totalCustomers: 500,
        averageCustomersPerDay: 50,
        totalSales: 1000000,
        dailyCumulative: new Map([[15, { sales: 1000000, budget: 1500000 }]]),
        elapsedDays: 15,
      }),
    })

    const el = widget.render(ctx)
    renderWithTheme(<>{el}</>)

    fireEvent.click(screen.getByText('客数・客単価'))

    // After switching to the customers tab, the label inside the card should be visible
    expect(screen.getByText(/日平均/)).toBeInTheDocument()
  })

  it('客数 = 0 では客数タブに「データなし」と表示', () => {
    const ctx = makeWidgetContext({
      result: makeStoreResult({
        totalCustomers: 0,
        dailyCumulative: new Map([[15, { sales: 1000000, budget: 1500000 }]]),
        elapsedDays: 15,
      }),
    })

    const el = widget.render(ctx)
    renderWithTheme(<>{el}</>)

    fireEvent.click(screen.getByText('客数・客単価'))

    expect(screen.getByText('客数データなし')).toBeInTheDocument()
  })

  it('仕入・粗利タブに切り替えると粗利率が表示される', () => {
    const ctx = makeWidgetContext({
      result: makeStoreResult({
        totalSales: 1000000,
        totalCost: 700000,
        grossSales: 1100000,
        totalConsumable: 5000,
        estMethodMargin: 250000,
        estMethodMarginRate: 0.25,
        totalCoreSales: 1000000,
        averageMarkupRate: 0.3,
        discountRate: 0.05,
        totalDiscount: 50000,
        dailyCumulative: new Map([[15, { sales: 1000000, budget: 1500000 }]]),
        elapsedDays: 15,
      }),
    })

    const el = widget.render(ctx)
    renderWithTheme(<>{el}</>)

    fireEvent.click(screen.getByText('仕入・粗利'))

    expect(screen.getByText('在庫金額/総仕入高')).toBeInTheDocument()
    expect(screen.getByText('値入率 / 値入額')).toBeInTheDocument()
  })

  it('前年客数データがある場合に前年比が表示される', () => {
    const prevDaily = new Map([
      [1, { sales: 90000, discount: 500, customers: 40 }],
    ])
    const ctx = makeWidgetContext({
      result: makeStoreResult({
        totalCustomers: 500,
        averageCustomersPerDay: 50,
        totalSales: 1000000,
        dailyCumulative: new Map([[15, { sales: 1000000, budget: 1500000 }]]),
        elapsedDays: 15,
      }),
      prevYear: makePrevYear(prevDaily, { totalCustomers: 480 }),
    })

    const el = widget.render(ctx)
    renderWithTheme(<>{el}</>)

    fireEvent.click(screen.getByText('客数・客単価'))

    expect(screen.getByText(/客数前年比/)).toBeInTheDocument()
  })

  it('客単価が正しく表示される', () => {
    const ctx = makeWidgetContext({
      result: makeStoreResult({
        totalCustomers: 500,
        averageCustomersPerDay: 50,
        totalSales: 1000000,
        dailyCumulative: new Map([[15, { sales: 1000000, budget: 1500000 }]]),
        elapsedDays: 15,
      }),
    })

    const el = widget.render(ctx)
    renderWithTheme(<>{el}</>)

    fireEvent.click(screen.getByText('客数・客単価'))

    // 客単価 = 1000000 / 500 = 2000
    expect(screen.getByText('2,000円')).toBeInTheDocument()
  })
})
