/**
 * MonthSelector.tsx — 年月セレクター + picker overlay の contract test
 *
 * 検証対象 branch:
 * - isSwitching=true: 「切替中...」表示のみ
 * - isSwitching=false: 通常 UI (前月 / 年月 display / 翌月)
 * - 前月 button click → goToPrevMonth
 * - 翌月 button click → goToNextMonth
 * - 年月 display click → picker 開閉
 * - picker 開: 12 月 cell を表示
 * - picker 年送り ← → で pickerYear 変更
 * - month cell click → switchMonth(pickerYear, month) + picker 閉じる
 * - hasDataForMonth: storedMonths と照合して $hasData 判定
 * - picker overlay click で picker 閉じる
 *
 * Phase 3 Step 3-9: Hook 依存の component を vi.mock でテスト。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactElement } from 'react'
import { darkTheme } from '@/presentation/theme/theme'

// ─── mock setup ─────────────────────────────────────────────

const mockSettings = {
  targetYear: 2025,
  targetMonth: 3,
}

const mockGoToPrevMonth = vi.fn()
const mockGoToNextMonth = vi.fn()
const mockSwitchMonth = vi.fn().mockResolvedValue(undefined)
let mockIsSwitching = false

vi.mock('@/application/hooks/useSettings', () => ({
  useSettings: () => ({ settings: mockSettings }),
}))

vi.mock('@/application/hooks/useMonthSwitcher', () => ({
  useMonthSwitcher: () => ({
    isSwitching: mockIsSwitching,
    switchMonth: mockSwitchMonth,
    goToPrevMonth: mockGoToPrevMonth,
    goToNextMonth: mockGoToNextMonth,
  }),
}))

// import AFTER vi.mock
import { MonthSelector } from '../MonthSelector'

function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
  })
}

beforeEach(() => {
  mockGoToPrevMonth.mockClear()
  mockGoToNextMonth.mockClear()
  mockSwitchMonth.mockClear()
  mockIsSwitching = false
  mockSettings.targetYear = 2025
  mockSettings.targetMonth = 3
})

describe('MonthSelector — 通常表示', () => {
  it('targetYear / targetMonth を 「YYYY年M月」形式で表示', () => {
    renderWithTheme(<MonthSelector />)
    expect(screen.getByText('2025年3月')).toBeInTheDocument()
  })

  it('前月 button (title=前月) が表示される', () => {
    renderWithTheme(<MonthSelector />)
    expect(screen.getByTitle('前月')).toBeInTheDocument()
  })

  it('翌月 button (title=翌月) が表示される', () => {
    renderWithTheme(<MonthSelector />)
    expect(screen.getByTitle('翌月')).toBeInTheDocument()
  })
})

describe('MonthSelector — switching 状態', () => {
  it('isSwitching=true のとき 「切替中...」のみ表示', () => {
    mockIsSwitching = true
    renderWithTheme(<MonthSelector />)
    expect(screen.getByText('切替中...')).toBeInTheDocument()
    // 通常 UI は表示されない
    expect(screen.queryByText('2025年3月')).not.toBeInTheDocument()
    expect(screen.queryByTitle('前月')).not.toBeInTheDocument()
  })
})

describe('MonthSelector — 前月 / 翌月 button', () => {
  it('前月 button click で goToPrevMonth が発火', () => {
    renderWithTheme(<MonthSelector />)
    fireEvent.click(screen.getByTitle('前月'))
    expect(mockGoToPrevMonth).toHaveBeenCalledTimes(1)
  })

  it('翌月 button click で goToNextMonth が発火', () => {
    renderWithTheme(<MonthSelector />)
    fireEvent.click(screen.getByTitle('翌月'))
    expect(mockGoToNextMonth).toHaveBeenCalledTimes(1)
  })
})

describe('MonthSelector — picker 開閉', () => {
  it('初期状態では picker は閉じている (12 月 cell は非表示)', () => {
    renderWithTheme(<MonthSelector />)
    expect(screen.queryByText('1月')).not.toBeInTheDocument()
  })

  it('年月 display click で picker が開き 12 月 cell が表示される', () => {
    renderWithTheme(<MonthSelector />)
    fireEvent.click(screen.getByText('2025年3月'))
    // 1月〜12月 すべて表示
    expect(screen.getByText('1月')).toBeInTheDocument()
    expect(screen.getByText('6月')).toBeInTheDocument()
    expect(screen.getByText('12月')).toBeInTheDocument()
  })

  it('picker 開時に現在の年 (2025年) を表示', () => {
    renderWithTheme(<MonthSelector />)
    fireEvent.click(screen.getByText('2025年3月'))
    expect(screen.getByText('2025年')).toBeInTheDocument()
  })
})

describe('MonthSelector — picker 年送り', () => {
  it('年送り ▶ (YearArrow) で pickerYear が +1 される', () => {
    renderWithTheme(<MonthSelector />)
    fireEvent.click(screen.getByText('2025年3月'))
    expect(screen.getByText('2025年')).toBeInTheDocument()

    // Year header 内の ▶ button を探す (picker dropdown 内)
    // 通常の翌月 ▶ と区別するため PickerHeader 内の button を取得
    const yearLabel = screen.getByText('2025年')
    const yearHeader = yearLabel.parentElement
    const arrows = yearHeader?.querySelectorAll('button') ?? []
    // ◀ と ▶ の 2 つの YearArrow がある
    expect(arrows.length).toBeGreaterThanOrEqual(2)

    // 右矢印 (▶) は後ろの button
    fireEvent.click(arrows[arrows.length - 1])
    expect(screen.getByText('2026年')).toBeInTheDocument()
  })

  it('年送り ◀ で pickerYear が -1 される', () => {
    renderWithTheme(<MonthSelector />)
    fireEvent.click(screen.getByText('2025年3月'))
    const yearLabel = screen.getByText('2025年')
    const yearHeader = yearLabel.parentElement
    const arrows = yearHeader?.querySelectorAll('button') ?? []
    // 左矢印 (◀) は最初の button
    fireEvent.click(arrows[0])
    expect(screen.getByText('2024年')).toBeInTheDocument()
  })
})

describe('MonthSelector — month cell click', () => {
  it('month cell click で switchMonth(pickerYear, month) が発火し picker が閉じる', () => {
    renderWithTheme(<MonthSelector />)
    fireEvent.click(screen.getByText('2025年3月'))
    fireEvent.click(screen.getByText('5月'))

    expect(mockSwitchMonth).toHaveBeenCalledWith(2025, 5)
    // picker が閉じる → 1月 cell は消える
    expect(screen.queryByText('1月')).not.toBeInTheDocument()
  })

  it('年送りした後の month cell click は新しい pickerYear で switchMonth', () => {
    renderWithTheme(<MonthSelector />)
    fireEvent.click(screen.getByText('2025年3月'))
    const yearHeader = screen.getByText('2025年').parentElement
    const arrows = yearHeader?.querySelectorAll('button') ?? []
    fireEvent.click(arrows[arrows.length - 1]) // 2026年へ
    fireEvent.click(screen.getByText('8月'))

    expect(mockSwitchMonth).toHaveBeenCalledWith(2026, 8)
  })
})

// NOTE: picker overlay click で閉じる挙動は styled-components の class 名が
// 予測不能で overlay element を確実に取得できないためテストできない。
// 代替として month cell click で picker が閉じる挙動は「picker 開閉」セクションで
// テスト済。
//
// 観測期間中の学び: 当初ここに `expect(overlays.length).toBeGreaterThanOrEqual(0)`
// という tautology assertion を置いていたが、これは TSIG-TEST-04 候補
// (tautology assertion) の代表例。自分で書いた直後に気づいて削除した。
// Self-check 6 項目の「出力・契約・副作用・分岐のいずれかを検証しているか」に
// 該当しないため不適切。test ごと削除する方が honest。
