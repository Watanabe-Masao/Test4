import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
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

  it('売上実績セクションがレンダリングされる', () => {
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

  it('客数 > 0 で客数・客単価セクションが表示される', () => {
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

    expect(screen.getByText('客数・客単価')).toBeInTheDocument()
  })

  it('客数 = 0 では客数セクションが非表示', () => {
    const ctx = makeWidgetContext({
      result: makeStoreResult({
        totalCustomers: 0,
        dailyCumulative: new Map([[15, { sales: 1000000, budget: 1500000 }]]),
        elapsedDays: 15,
      }),
    })

    const el = widget.render(ctx)
    renderWithTheme(<>{el}</>)

    expect(screen.queryByText('客数・客単価')).not.toBeInTheDocument()
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

    // 客単価 = 1000000 / 500 = 2000
    expect(screen.getByText('2,000円')).toBeInTheDocument()
  })
})

describe('KPI: 客数ウィジェット', () => {
  const widget = WIDGET_MAP.get('kpi-customers')!

  it('ウィジェットが登録されている', () => {
    expect(widget).toBeDefined()
    expect(widget.size).toBe('kpi')
  })

  it('客数KPIがレンダリングされる', () => {
    const ctx = makeWidgetContext({
      result: makeStoreResult({
        totalCustomers: 500,
        averageCustomersPerDay: 50,
      }),
    })

    const el = widget.render(ctx)
    renderWithTheme(<>{el}</>)

    expect(screen.getByText('客数')).toBeInTheDocument()
    expect(screen.getByText('500人')).toBeInTheDocument()
  })
})

describe('KPI: 客単価ウィジェット', () => {
  const widget = WIDGET_MAP.get('kpi-transaction-value')!

  it('ウィジェットが登録されている', () => {
    expect(widget).toBeDefined()
    expect(widget.size).toBe('kpi')
  })

  it('客単価KPIがレンダリングされる', () => {
    const ctx = makeWidgetContext({
      result: makeStoreResult({
        totalCustomers: 500,
        totalSales: 1000000,
      }),
    })

    const el = widget.render(ctx)
    renderWithTheme(<>{el}</>)

    expect(screen.getByText('客単価')).toBeInTheDocument()
  })
})
