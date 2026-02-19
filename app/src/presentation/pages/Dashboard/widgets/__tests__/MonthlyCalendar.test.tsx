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
    const daily = new Map([
      [1, makeDailyRecord({ day: 1, sales: 100000 })],
    ])
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

  it('客数データがある場合に「客」「単」セルが表示される', () => {
    const daily = new Map([
      [1, makeDailyRecord({ day: 1, sales: 100000, customers: 50 })],
    ])
    const budgetDaily = new Map([[1, 90000]])
    const ctx = makeWidgetContext({
      result: makeStoreResult({ daily, budgetDaily }),
      year: 2026,
      month: 2,
    })

    renderWithTheme(<MonthlyCalendarWidget ctx={ctx} />)

    expect(screen.getByText('客 50')).toBeInTheDocument()
    // 客単価 = 100000 / 50 = 2000
    expect(screen.getByText('単 2,000')).toBeInTheDocument()
  })

  it('客数 = 0 では客数セルが非表示', () => {
    const daily = new Map([
      [1, makeDailyRecord({ day: 1, sales: 100000 })],
    ])
    const budgetDaily = new Map([[1, 90000]])
    const ctx = makeWidgetContext({
      result: makeStoreResult({ daily, budgetDaily }),
      year: 2026,
      month: 2,
    })

    renderWithTheme(<MonthlyCalendarWidget ctx={ctx} />)

    expect(screen.queryByText(/^客 /)).not.toBeInTheDocument()
    expect(screen.queryByText(/^単 /)).not.toBeInTheDocument()
  })

  it('複数日の客数が各セルに表示される', () => {
    const daily = new Map([
      [1, makeDailyRecord({ day: 1, sales: 100000, customers: 50 })],
      [2, makeDailyRecord({ day: 2, sales: 150000, customers: 75 })],
    ])
    const budgetDaily = new Map([[1, 90000], [2, 120000]])
    const ctx = makeWidgetContext({
      result: makeStoreResult({ daily, budgetDaily }),
      year: 2026,
      month: 2,
    })

    renderWithTheme(<MonthlyCalendarWidget ctx={ctx} />)

    expect(screen.getByText('客 50')).toBeInTheDocument()
    expect(screen.getByText('客 75')).toBeInTheDocument()
  })
})
