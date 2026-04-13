/**
 * DataEndDaySlider.tsx — slider + numeric input の contract test
 *
 * 検証対象 branch:
 * - 初期表示: localEndDay = settings.dataEndDay ?? daysInMonth
 * - dataEndDay > daysInMonth は Math.min で clamp される
 * - detectedMaxDay > 0 で「検出: N日」hint を表示
 * - reset button: localEndDay !== detectedMaxDay && detectedMaxDay > 0 の条件で表示
 * - slider 変更 → debounce (150ms) 後に updateSettings + onPeriodEndDayChange
 * - reset button click → 即座に updateSettings (debounce 経由しない)
 * - reset 時 detectedMaxDay >= daysInMonth → daysInMonth に clamp
 * - dataEndDay = daysInMonth のとき null として保存
 * - number input: 範囲外 / NaN を reject
 *
 * Phase 3 Step 3-5: coverage 0% component の継続テスト追加。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { render, screen, fireEvent, act } from '@testing-library/react'
import type { ReactElement } from 'react'
import { DataEndDaySlider } from '../DataEndDaySlider'
import { darkTheme } from '@/presentation/theme/theme'
import type { AppSettings } from '@/domain/models/storeTypes'

function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
  })
}

// 必要フィールドだけ持つ minimal AppSettings (cast pattern)
function makeSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return { dataEndDay: null, ...overrides } as AppSettings
}

describe('DataEndDaySlider — 初期表示', () => {
  it('settings.dataEndDay が null なら daysInMonth を表示', () => {
    renderWithTheme(
      <DataEndDaySlider
        daysInMonth={31}
        detectedMaxDay={0}
        settings={makeSettings()}
        updateSettings={vi.fn()}
      />,
    )
    expect(screen.getByText('31日 / 31日')).toBeInTheDocument()
  })

  it('settings.dataEndDay = 15 なら 15日 を表示', () => {
    renderWithTheme(
      <DataEndDaySlider
        daysInMonth={31}
        detectedMaxDay={0}
        settings={makeSettings({ dataEndDay: 15 })}
        updateSettings={vi.fn()}
      />,
    )
    expect(screen.getByText('15日 / 31日')).toBeInTheDocument()
  })

  it('dataEndDay > daysInMonth は Math.min で clamp される (35 → 30)', () => {
    renderWithTheme(
      <DataEndDaySlider
        daysInMonth={30}
        detectedMaxDay={0}
        settings={makeSettings({ dataEndDay: 35 })}
        updateSettings={vi.fn()}
      />,
    )
    expect(screen.getByText('30日 / 30日')).toBeInTheDocument()
  })
})

describe('DataEndDaySlider — detectedMaxDay hint', () => {
  it('detectedMaxDay > 0 で「検出: N日」hint を表示', () => {
    renderWithTheme(
      <DataEndDaySlider
        daysInMonth={31}
        detectedMaxDay={20}
        settings={makeSettings({ dataEndDay: 15 })}
        updateSettings={vi.fn()}
      />,
    )
    expect(screen.getByText(/検出:\s*20日/)).toBeInTheDocument()
  })

  it('detectedMaxDay = 0 では hint を表示しない', () => {
    renderWithTheme(
      <DataEndDaySlider
        daysInMonth={31}
        detectedMaxDay={0}
        settings={makeSettings()}
        updateSettings={vi.fn()}
      />,
    )
    expect(screen.queryByText(/検出:/)).not.toBeInTheDocument()
  })
})

describe('DataEndDaySlider — Reset button', () => {
  it('localEndDay !== detectedMaxDay かつ detectedMaxDay > 0 で reset button 表示', () => {
    renderWithTheme(
      <DataEndDaySlider
        daysInMonth={31}
        detectedMaxDay={20}
        settings={makeSettings({ dataEndDay: 15 })}
        updateSettings={vi.fn()}
      />,
    )
    expect(screen.getByText('リセット')).toBeInTheDocument()
  })

  it('localEndDay === detectedMaxDay では reset button 非表示', () => {
    renderWithTheme(
      <DataEndDaySlider
        daysInMonth={31}
        detectedMaxDay={20}
        settings={makeSettings({ dataEndDay: 20 })}
        updateSettings={vi.fn()}
      />,
    )
    expect(screen.queryByText('リセット')).not.toBeInTheDocument()
  })

  it('detectedMaxDay = 0 では reset button 非表示 (条件不成立)', () => {
    renderWithTheme(
      <DataEndDaySlider
        daysInMonth={31}
        detectedMaxDay={0}
        settings={makeSettings({ dataEndDay: 15 })}
        updateSettings={vi.fn()}
      />,
    )
    expect(screen.queryByText('リセット')).not.toBeInTheDocument()
  })

  it('reset button click で updateSettings + onPeriodEndDayChange が即座に発火する', () => {
    const updateSettings = vi.fn()
    const onPeriodEndDayChange = vi.fn()
    renderWithTheme(
      <DataEndDaySlider
        daysInMonth={31}
        detectedMaxDay={20}
        settings={makeSettings({ dataEndDay: 15 })}
        updateSettings={updateSettings}
        onPeriodEndDayChange={onPeriodEndDayChange}
      />,
    )
    fireEvent.click(screen.getByText('リセット'))
    // detectedMaxDay (20) < daysInMonth (31) → そのまま 20
    expect(updateSettings).toHaveBeenCalledWith({ dataEndDay: 20 })
    expect(onPeriodEndDayChange).toHaveBeenCalledWith(20)
  })

  it('reset 時 detectedMaxDay >= daysInMonth なら daysInMonth に clamp + null として保存', () => {
    const updateSettings = vi.fn()
    const onPeriodEndDayChange = vi.fn()
    renderWithTheme(
      <DataEndDaySlider
        daysInMonth={30}
        detectedMaxDay={31}
        settings={makeSettings({ dataEndDay: 15 })}
        updateSettings={updateSettings}
        onPeriodEndDayChange={onPeriodEndDayChange}
      />,
    )
    fireEvent.click(screen.getByText('リセット'))
    // detectedMaxDay (31) >= daysInMonth (30) → effectiveDay = 30 → null
    expect(updateSettings).toHaveBeenCalledWith({ dataEndDay: null })
    expect(onPeriodEndDayChange).toHaveBeenCalledWith(30)
  })
})

describe('DataEndDaySlider — debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('slider 変更直後は updateSettings がまだ呼ばれない (debounce 150ms 待ち)', () => {
    const updateSettings = vi.fn()
    renderWithTheme(
      <DataEndDaySlider
        daysInMonth={31}
        detectedMaxDay={0}
        settings={makeSettings()}
        updateSettings={updateSettings}
      />,
    )
    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '10' } })
    // 即時には呼ばれない
    expect(updateSettings).not.toHaveBeenCalled()
  })

  it('slider 変更後 150ms 経過で updateSettings が呼ばれる', () => {
    const updateSettings = vi.fn()
    const onPeriodEndDayChange = vi.fn()
    renderWithTheme(
      <DataEndDaySlider
        daysInMonth={31}
        detectedMaxDay={0}
        settings={makeSettings()}
        updateSettings={updateSettings}
        onPeriodEndDayChange={onPeriodEndDayChange}
      />,
    )
    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '10' } })
    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(updateSettings).toHaveBeenCalledWith({ dataEndDay: 10 })
    expect(onPeriodEndDayChange).toHaveBeenCalledWith(10)
  })

  it('連続変更は最後の値だけが debounce 後に反映される', () => {
    const updateSettings = vi.fn()
    renderWithTheme(
      <DataEndDaySlider
        daysInMonth={31}
        detectedMaxDay={0}
        settings={makeSettings()}
        updateSettings={updateSettings}
      />,
    )
    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '5' } })
    fireEvent.change(slider, { target: { value: '10' } })
    fireEvent.change(slider, { target: { value: '15' } })
    act(() => {
      vi.advanceTimersByTime(150)
    })
    // 1 回だけ、最後の値で呼ばれる
    expect(updateSettings).toHaveBeenCalledTimes(1)
    expect(updateSettings).toHaveBeenCalledWith({ dataEndDay: 15 })
  })

  it('slider 値が daysInMonth と一致するとき null として保存される', () => {
    const updateSettings = vi.fn()
    renderWithTheme(
      <DataEndDaySlider
        daysInMonth={31}
        detectedMaxDay={0}
        settings={makeSettings({ dataEndDay: 20 })}
        updateSettings={updateSettings}
      />,
    )
    const slider = screen.getByRole('slider')
    fireEvent.change(slider, { target: { value: '31' } })
    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(updateSettings).toHaveBeenCalledWith({ dataEndDay: null })
  })
})

describe('DataEndDaySlider — number input', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('number input 範囲内の値は debouncedUpdateEndDay を発火', () => {
    const updateSettings = vi.fn()
    renderWithTheme(
      <DataEndDaySlider
        daysInMonth={31}
        detectedMaxDay={0}
        settings={makeSettings()}
        updateSettings={updateSettings}
      />,
    )
    const numberInput = screen.getByRole('spinbutton')
    fireEvent.change(numberInput, { target: { value: '15' } })
    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(updateSettings).toHaveBeenCalledWith({ dataEndDay: 15 })
  })

  it('number input 範囲外 (0) は無視される', () => {
    const updateSettings = vi.fn()
    renderWithTheme(
      <DataEndDaySlider
        daysInMonth={31}
        detectedMaxDay={0}
        settings={makeSettings()}
        updateSettings={updateSettings}
      />,
    )
    const numberInput = screen.getByRole('spinbutton')
    fireEvent.change(numberInput, { target: { value: '0' } })
    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(updateSettings).not.toHaveBeenCalled()
  })

  it('number input 範囲外 (32) は無視される', () => {
    const updateSettings = vi.fn()
    renderWithTheme(
      <DataEndDaySlider
        daysInMonth={31}
        detectedMaxDay={0}
        settings={makeSettings()}
        updateSettings={updateSettings}
      />,
    )
    const numberInput = screen.getByRole('spinbutton')
    fireEvent.change(numberInput, { target: { value: '32' } })
    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(updateSettings).not.toHaveBeenCalled()
  })

  it('number input が空文字 (NaN) は無視される', () => {
    const updateSettings = vi.fn()
    renderWithTheme(
      <DataEndDaySlider
        daysInMonth={31}
        detectedMaxDay={0}
        settings={makeSettings()}
        updateSettings={updateSettings}
      />,
    )
    const numberInput = screen.getByRole('spinbutton')
    fireEvent.change(numberInput, { target: { value: '' } })
    act(() => {
      vi.advanceTimersByTime(150)
    })
    expect(updateSettings).not.toHaveBeenCalled()
  })
})
