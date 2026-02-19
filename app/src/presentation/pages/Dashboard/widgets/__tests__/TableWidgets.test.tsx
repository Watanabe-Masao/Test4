import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderDowAverage, renderWeeklySummary } from '../TableWidgets'
import {
  makeWidgetContext,
  makeStoreResult,
  makeDailyRecord,
  makePrevYear,
  renderWithTheme,
} from './widgetTestHelpers'

describe('renderDowAverage', () => {
  it('曜日平均テーブルがレンダリングされる', () => {
    const daily = new Map([
      [1, makeDailyRecord({ day: 1, sales: 100000 })],
      [2, makeDailyRecord({ day: 2, sales: 120000 })],
    ])
    const budgetDaily = new Map([[1, 90000], [2, 110000]])
    const ctx = makeWidgetContext({
      result: makeStoreResult({ daily, budgetDaily }),
      year: 2026,
      month: 2,
    })

    const el = renderDowAverage(ctx)
    renderWithTheme(<>{el}</>)

    expect(screen.getByText('曜日平均')).toBeInTheDocument()
    expect(screen.getByText('平均売上')).toBeInTheDocument()
    expect(screen.getByText('平均予算')).toBeInTheDocument()
  })

  it('客数データがある場合に平均客数・客単価列が表示される', () => {
    // 2026-02-02 は月曜日
    const daily = new Map([
      [2, makeDailyRecord({ day: 2, sales: 100000, customers: 50 })],
      [9, makeDailyRecord({ day: 9, sales: 120000, customers: 60 })],
    ])
    const ctx = makeWidgetContext({
      result: makeStoreResult({ daily }),
      year: 2026,
      month: 2,
    })

    const el = renderDowAverage(ctx)
    renderWithTheme(<>{el}</>)

    expect(screen.getByText('平均客数')).toBeInTheDocument()
    expect(screen.getByText('客単価')).toBeInTheDocument()
  })

  it('客数データがない場合は客数列が非表示', () => {
    const daily = new Map([
      [1, makeDailyRecord({ day: 1, sales: 100000 })],
    ])
    const ctx = makeWidgetContext({
      result: makeStoreResult({ daily }),
    })

    const el = renderDowAverage(ctx)
    renderWithTheme(<>{el}</>)

    expect(screen.queryByText('平均客数')).not.toBeInTheDocument()
    expect(screen.queryByText('客単価')).not.toBeInTheDocument()
  })

  it('前年データがある場合に前年列が表示される', () => {
    const daily = new Map([
      [1, makeDailyRecord({ day: 1, sales: 100000 })],
    ])
    const prevDaily = new Map([
      [1, { sales: 95000, discount: 1000, customers: 40 }],
    ])
    const ctx = makeWidgetContext({
      result: makeStoreResult({ daily }),
      prevYear: makePrevYear(prevDaily),
    })

    const el = renderDowAverage(ctx)
    renderWithTheme(<>{el}</>)

    expect(screen.getByText('前年同曜日平均')).toBeInTheDocument()
    expect(screen.getByText('前年差額')).toBeInTheDocument()
    expect(screen.getByText('前年同曜日比')).toBeInTheDocument()
  })
})

describe('renderWeeklySummary', () => {
  it('週別サマリーテーブルがレンダリングされる', () => {
    const daily = new Map([
      [1, makeDailyRecord({ day: 1, sales: 100000 })],
      [8, makeDailyRecord({ day: 8, sales: 120000 })],
    ])
    const budgetDaily = new Map([[1, 90000], [8, 110000]])
    const ctx = makeWidgetContext({
      result: makeStoreResult({ daily, budgetDaily }),
      year: 2026,
      month: 2,
    })

    const el = renderWeeklySummary(ctx)
    renderWithTheme(<>{el}</>)

    expect(screen.getByText('週別サマリー')).toBeInTheDocument()
    expect(screen.getByText('売上')).toBeInTheDocument()
    expect(screen.getByText('予算')).toBeInTheDocument()
  })

  it('客数データがある場合に客数・客単価列が表示される', () => {
    const daily = new Map([
      [1, makeDailyRecord({ day: 1, sales: 100000, customers: 50 })],
      [2, makeDailyRecord({ day: 2, sales: 120000, customers: 60 })],
    ])
    const ctx = makeWidgetContext({
      result: makeStoreResult({ daily }),
      year: 2026,
      month: 2,
    })

    const el = renderWeeklySummary(ctx)
    renderWithTheme(<>{el}</>)

    // ヘッダ: 客数・客単価列
    const headers = screen.getAllByRole('columnheader')
    const headerTexts = headers.map(h => h.textContent)
    expect(headerTexts).toContain('客数')
    expect(headerTexts).toContain('客単価')
  })

  it('客数データがない場合は客数列が非表示', () => {
    const daily = new Map([
      [1, makeDailyRecord({ day: 1, sales: 100000 })],
    ])
    const ctx = makeWidgetContext({
      result: makeStoreResult({ daily }),
    })

    const el = renderWeeklySummary(ctx)
    renderWithTheme(<>{el}</>)

    const headers = screen.getAllByRole('columnheader')
    const headerTexts = headers.map(h => h.textContent)
    expect(headerTexts).not.toContain('客数')
    expect(headerTexts).not.toContain('客単価')
  })

  it('週別客単価が正しく計算される', () => {
    // 1日〜7日が第1週（2026年2月）
    const daily = new Map([
      [1, makeDailyRecord({ day: 1, sales: 100000, customers: 50 })],
      [2, makeDailyRecord({ day: 2, sales: 200000, customers: 100 })],
    ])
    const ctx = makeWidgetContext({
      result: makeStoreResult({ daily }),
      year: 2026,
      month: 2,
    })

    const el = renderWeeklySummary(ctx)
    renderWithTheme(<>{el}</>)

    // 客単価 = (100000+200000) / (50+100) = 2000
    // 第1週と合計行などで複数表示される可能性あり
    const cells = screen.getAllByText('2,000円')
    expect(cells.length).toBeGreaterThanOrEqual(1)
  })
})
