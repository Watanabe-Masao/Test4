/**
 * OnlineStatusChip.tsx (DataStatusChip) — 状態 chip の contract test
 *
 * 検証対象 branch:
 * - status 判定: isCalculated → calculated / hasData → imported / else no-data
 * - 各 status の label 表示
 * - OnlineStatusChip alias (後方互換) が DataStatusChip と同じ動作
 * - long press (500ms) で onLongPress 発火
 * - 500ms 未満で release すると発火しない
 * - onLongPress 未指定時は title 属性なし / handler が no-op
 *
 * Phase 3 Step 3-16: self-contained component.
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { render, screen, fireEvent, act } from '@testing-library/react'
import type { ReactElement } from 'react'
import { DataStatusChip, OnlineStatusChip } from '../OnlineStatusChip'
import { darkTheme } from '@/presentation/theme/theme'

function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
  })
}

describe('DataStatusChip — status 判定', () => {
  it('isCalculated=true: 計算済 を表示', () => {
    renderWithTheme(<DataStatusChip isCalculated hasData />)
    expect(screen.getByText('計算済')).toBeInTheDocument()
  })

  it('hasData=true, isCalculated=false: 取込済 を表示', () => {
    renderWithTheme(<DataStatusChip hasData />)
    expect(screen.getByText('取込済')).toBeInTheDocument()
  })

  it('hasData=false, isCalculated=false: 未取込 を表示', () => {
    renderWithTheme(<DataStatusChip />)
    expect(screen.getByText('未取込')).toBeInTheDocument()
  })

  it('isCalculated=true は hasData=false でも 計算済 に優先される', () => {
    renderWithTheme(<DataStatusChip isCalculated hasData={false} />)
    expect(screen.getByText('計算済')).toBeInTheDocument()
    expect(screen.queryByText('未取込')).not.toBeInTheDocument()
  })
})

describe('DataStatusChip — long press', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('500ms 長押しで onLongPress 発火', () => {
    const onLongPress = vi.fn()
    renderWithTheme(<DataStatusChip hasData onLongPress={onLongPress} />)
    const chip = screen.getByRole('button')

    fireEvent.pointerDown(chip)
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(onLongPress).toHaveBeenCalledTimes(1)
  })

  it('500ms 未満で pointerUp すると発火しない', () => {
    const onLongPress = vi.fn()
    renderWithTheme(<DataStatusChip hasData onLongPress={onLongPress} />)
    const chip = screen.getByRole('button')

    fireEvent.pointerDown(chip)
    act(() => {
      vi.advanceTimersByTime(300)
    })
    fireEvent.pointerUp(chip)
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('pointerLeave でも clear される', () => {
    const onLongPress = vi.fn()
    renderWithTheme(<DataStatusChip hasData onLongPress={onLongPress} />)
    const chip = screen.getByRole('button')

    fireEvent.pointerDown(chip)
    act(() => {
      vi.advanceTimersByTime(300)
    })
    fireEvent.pointerLeave(chip)
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(onLongPress).not.toHaveBeenCalled()
  })

  it('onLongPress 未指定時は title 属性なし', () => {
    renderWithTheme(<DataStatusChip hasData />)
    const chip = screen.getByRole('button')
    expect(chip).not.toHaveAttribute('title', '長押しでデータ再取得')
  })

  it('onLongPress 指定時は title 属性あり', () => {
    renderWithTheme(<DataStatusChip hasData onLongPress={vi.fn()} />)
    const chip = screen.getByRole('button')
    expect(chip).toHaveAttribute('title', '長押しでデータ再取得')
  })

  it('onLongPress 未指定時 pointerDown は no-op (timer 設定されない)', () => {
    const onLongPress = vi.fn()
    renderWithTheme(<DataStatusChip hasData />)
    const chip = screen.getByRole('button')

    fireEvent.pointerDown(chip)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(onLongPress).not.toHaveBeenCalled()
  })
})

describe('OnlineStatusChip — 後方互換 alias', () => {
  it('DataStatusChip と同じ動作 (alias)', () => {
    renderWithTheme(<OnlineStatusChip hasData />)
    expect(screen.getByText('取込済')).toBeInTheDocument()
  })

  it('OnlineStatusChip でも long press 動作する', () => {
    vi.useFakeTimers()
    const onLongPress = vi.fn()
    renderWithTheme(<OnlineStatusChip hasData onLongPress={onLongPress} />)
    const chip = screen.getByRole('button')

    fireEvent.pointerDown(chip)
    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(onLongPress).toHaveBeenCalled()
    vi.useRealTimers()
  })
})
