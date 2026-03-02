import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { MonthlyCalendarWidget } from '../MonthlyCalendar'
import {
  makeWidgetContext,
  makeStoreResult,
  makeDailyRecord,
  renderWithTheme,
} from './widgetTestHelpers'

describe('MonthlyCalendarWidget', () => {
  it('カレンダーがレンダリングされる', () => {
    const daily = new Map([[1, makeDailyRecord({ day: 1, sales: 100000 })]])
    const budgetDaily = new Map([[1, 90000]])
    const ctx = makeWidgetContext({
      result: makeStoreResult({ daily, budgetDaily }),
      year: 2026,
      month: 2,
    })

    renderWithTheme(<MonthlyCalendarWidget ctx={ctx} />)

    expect(screen.getByText(/月間カレンダー/)).toBeInTheDocument()
    expect(screen.getByText('月')).toBeInTheDocument()
    expect(screen.getByText('火')).toBeInTheDocument()
  })

  it('実績売上がセルに表示される', () => {
    const daily = new Map([[1, makeDailyRecord({ day: 1, sales: 100000, customers: 50 })]])
    const budgetDaily = new Map([[1, 90000]])
    const ctx = makeWidgetContext({
      result: makeStoreResult({ daily, budgetDaily }),
      year: 2026,
      month: 2,
    })

    renderWithTheme(<MonthlyCalendarWidget ctx={ctx} />)

    // Simplified cell shows hero sales value (千円表記)
    expect(screen.getByText('100千')).toBeInTheDocument()
  })

  it('予算差がセルに表示される', () => {
    const daily = new Map([[1, makeDailyRecord({ day: 1, sales: 100000 })]])
    const budgetDaily = new Map([[1, 90000]])
    const ctx = makeWidgetContext({
      result: makeStoreResult({ daily, budgetDaily }),
      year: 2026,
      month: 2,
    })

    renderWithTheme(<MonthlyCalendarWidget ctx={ctx} />)

    // Budget diff: 100000 - 90000 = +10000 → +10千
    expect(screen.getByText(/▲.*\+10千/)).toBeInTheDocument()
  })

  it('複数日の売上が各セルに表示される', () => {
    const daily = new Map([
      [1, makeDailyRecord({ day: 1, sales: 100000, customers: 50 })],
      [2, makeDailyRecord({ day: 2, sales: 150000, customers: 75 })],
    ])
    const budgetDaily = new Map([
      [1, 90000],
      [2, 120000],
    ])
    const ctx = makeWidgetContext({
      result: makeStoreResult({ daily, budgetDaily }),
      year: 2026,
      month: 2,
    })

    renderWithTheme(<MonthlyCalendarWidget ctx={ctx} />)

    expect(screen.getByText('100千')).toBeInTheDocument()
    expect(screen.getByText('150千')).toBeInTheDocument()
  })
})
