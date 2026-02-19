import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderPlanActualForecast } from '../PlanActualForecast'
import {
  makeWidgetContext,
  makeStoreResult,
  makePrevYear,
  renderWithTheme,
} from './widgetTestHelpers'

describe('renderPlanActualForecast', () => {
  it('PLAN / ACTUAL / FORECAST 3列がレンダリングされる', () => {
    const ctx = makeWidgetContext()
    const el = renderPlanActualForecast(ctx)
    renderWithTheme(<>{el}</>)

    expect(screen.getByText('PLAN')).toBeInTheDocument()
    expect(screen.getByText('ACTUAL')).toBeInTheDocument()
    expect(screen.getByText('FORECAST')).toBeInTheDocument()
  })

  it('予算・粗利基本メトリクスが表示される', () => {
    const ctx = makeWidgetContext({
      result: makeStoreResult({
        budget: 3000000,
        grossProfitBudget: 750000,
      }),
    })

    const el = renderPlanActualForecast(ctx)
    renderWithTheme(<>{el}</>)

    expect(screen.getByText('月間売上予算')).toBeInTheDocument()
    expect(screen.getByText('月間粗利額予算')).toBeInTheDocument()
    expect(screen.getByText('売上達成率')).toBeInTheDocument()
  })

  it('客数 > 0 で ACTUAL 列に客数メトリクスが表示される', () => {
    const ctx = makeWidgetContext({
      result: makeStoreResult({
        totalCustomers: 500,
        averageCustomersPerDay: 50,
        totalSales: 1000000,
        salesDays: 10,
      }),
    })

    const el = renderPlanActualForecast(ctx)
    renderWithTheme(<>{el}</>)

    expect(screen.getByText('期中客数')).toBeInTheDocument()
    expect(screen.getByText('客単価')).toBeInTheDocument()
    // 500人
    expect(screen.getByText('500人')).toBeInTheDocument()
    // 客単価 = 1000000 / 500 = 2000
    expect(screen.getByText('2,000円')).toBeInTheDocument()
  })

  it('客数 = 0 では客数メトリクスが非表示', () => {
    const ctx = makeWidgetContext({
      result: makeStoreResult({
        totalCustomers: 0,
        averageCustomersPerDay: 0,
      }),
    })

    const el = renderPlanActualForecast(ctx)
    renderWithTheme(<>{el}</>)

    expect(screen.queryByText('期中客数')).not.toBeInTheDocument()
    expect(screen.queryByText('客単価')).not.toBeInTheDocument()
  })

  it('前年客数がある場合に前年比が表示される', () => {
    const prevDaily = new Map([
      [1, { sales: 90000, discount: 500, customers: 40 }],
    ])
    const ctx = makeWidgetContext({
      result: makeStoreResult({
        totalCustomers: 500,
        averageCustomersPerDay: 50,
        totalSales: 1000000,
        salesDays: 10,
      }),
      prevYear: makePrevYear(prevDaily, { totalCustomers: 480 }),
    })

    const el = renderPlanActualForecast(ctx)
    renderWithTheme(<>{el}</>)

    expect(screen.getByText('客数前年比')).toBeInTheDocument()
  })

  it('FORECAST 列に月末客数着地が表示される', () => {
    const ctx = makeWidgetContext({
      daysInMonth: 28,
      result: makeStoreResult({
        totalCustomers: 500,
        averageCustomersPerDay: 50,
        totalSales: 1000000,
        projectedSales: 2800000,
        salesDays: 10,
        elapsedDays: 15,
      }),
    })

    const el = renderPlanActualForecast(ctx)
    renderWithTheme(<>{el}</>)

    expect(screen.getByText('月末客数着地')).toBeInTheDocument()
    expect(screen.getByText('着地客単価')).toBeInTheDocument()
  })

  it('salesDays = 0 では FORECAST 客数が非表示', () => {
    const ctx = makeWidgetContext({
      result: makeStoreResult({
        totalCustomers: 500,
        salesDays: 0,
      }),
    })

    const el = renderPlanActualForecast(ctx)
    renderWithTheme(<>{el}</>)

    expect(screen.queryByText('月末客数着地')).not.toBeInTheDocument()
  })
})
