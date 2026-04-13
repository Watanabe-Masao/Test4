/**
 * SegmentedControl.tsx — radiogroup の contract test
 *
 * 検証対象 branch:
 * - render: option 数だけ radio button を生成
 * - aria-checked: value === option.value で true / false
 * - tabIndex: active が 0、その他は -1 (roving tabindex)
 * - role=radiogroup + ariaLabel
 * - click → onChange(value)
 * - キーボードナビゲーション:
 *   - ArrowRight / ArrowDown: 次の option に移動 (循環)
 *   - ArrowLeft / ArrowUp: 前の option に移動 (循環)
 *   - Home: 最初に移動
 *   - End: 最後に移動
 *   - 他キー: 何もしない
 *
 * Phase 3 Step 3-8: coverage 0% component を batch で攻める。
 */
import { describe, it, expect, vi } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactElement } from 'react'
import { SegmentedControl } from '../SegmentedControl'
import { darkTheme } from '@/presentation/theme/theme'

function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
  })
}

const options = [
  { value: 'day', label: '日別' },
  { value: 'week', label: '週別' },
  { value: 'month', label: '月別' },
] as const

type Opt = (typeof options)[number]['value']

describe('SegmentedControl — render', () => {
  it('option 数だけ radio button を生成する', () => {
    renderWithTheme(<SegmentedControl<Opt> options={options} value="day" onChange={vi.fn()} />)
    expect(screen.getAllByRole('radio')).toHaveLength(3)
  })

  it('label が表示される', () => {
    renderWithTheme(<SegmentedControl<Opt> options={options} value="day" onChange={vi.fn()} />)
    expect(screen.getByText('日別')).toBeInTheDocument()
    expect(screen.getByText('週別')).toBeInTheDocument()
    expect(screen.getByText('月別')).toBeInTheDocument()
  })

  it('role=radiogroup + ariaLabel が設定される', () => {
    renderWithTheme(
      <SegmentedControl<Opt>
        options={options}
        value="day"
        onChange={vi.fn()}
        ariaLabel="期間選択"
      />,
    )
    const group = screen.getByRole('radiogroup')
    expect(group).toHaveAttribute('aria-label', '期間選択')
  })
})

describe('SegmentedControl — aria-checked / tabIndex (roving)', () => {
  it('value=day のとき day だけ aria-checked=true', () => {
    renderWithTheme(<SegmentedControl<Opt> options={options} value="day" onChange={vi.fn()} />)
    const dayBtn = screen.getByRole('radio', { name: '日別' })
    const weekBtn = screen.getByRole('radio', { name: '週別' })
    const monthBtn = screen.getByRole('radio', { name: '月別' })
    expect(dayBtn).toHaveAttribute('aria-checked', 'true')
    expect(weekBtn).toHaveAttribute('aria-checked', 'false')
    expect(monthBtn).toHaveAttribute('aria-checked', 'false')
  })

  it('value=week のとき week だけ aria-checked=true', () => {
    renderWithTheme(<SegmentedControl<Opt> options={options} value="week" onChange={vi.fn()} />)
    expect(screen.getByRole('radio', { name: '週別' })).toHaveAttribute('aria-checked', 'true')
  })

  it('active が tabIndex=0、その他は tabIndex=-1', () => {
    renderWithTheme(<SegmentedControl<Opt> options={options} value="week" onChange={vi.fn()} />)
    const dayBtn = screen.getByRole('radio', { name: '日別' })
    const weekBtn = screen.getByRole('radio', { name: '週別' })
    const monthBtn = screen.getByRole('radio', { name: '月別' })
    expect(dayBtn).toHaveAttribute('tabindex', '-1')
    expect(weekBtn).toHaveAttribute('tabindex', '0')
    expect(monthBtn).toHaveAttribute('tabindex', '-1')
  })
})

describe('SegmentedControl — click', () => {
  it('non-active radio click で onChange が発火する', () => {
    const onChange = vi.fn()
    renderWithTheme(<SegmentedControl<Opt> options={options} value="day" onChange={onChange} />)
    fireEvent.click(screen.getByRole('radio', { name: '月別' }))
    expect(onChange).toHaveBeenCalledWith('month')
  })

  it('active radio を click しても onChange は同じ value で発火 (idempotent)', () => {
    const onChange = vi.fn()
    renderWithTheme(<SegmentedControl<Opt> options={options} value="day" onChange={onChange} />)
    fireEvent.click(screen.getByRole('radio', { name: '日別' }))
    expect(onChange).toHaveBeenCalledWith('day')
  })
})

describe('SegmentedControl — keyboard navigation', () => {
  it('ArrowRight で次の option に移動 (day → week)', () => {
    const onChange = vi.fn()
    renderWithTheme(<SegmentedControl<Opt> options={options} value="day" onChange={onChange} />)
    const dayBtn = screen.getByRole('radio', { name: '日別' })
    fireEvent.keyDown(dayBtn, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith('week')
  })

  it('ArrowDown でも次の option (alias)', () => {
    const onChange = vi.fn()
    renderWithTheme(<SegmentedControl<Opt> options={options} value="day" onChange={onChange} />)
    fireEvent.keyDown(screen.getByRole('radio', { name: '日別' }), { key: 'ArrowDown' })
    expect(onChange).toHaveBeenCalledWith('week')
  })

  it('ArrowLeft で前の option (week → day)', () => {
    const onChange = vi.fn()
    renderWithTheme(<SegmentedControl<Opt> options={options} value="week" onChange={onChange} />)
    fireEvent.keyDown(screen.getByRole('radio', { name: '週別' }), { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenCalledWith('day')
  })

  it('ArrowUp でも前の option (alias)', () => {
    const onChange = vi.fn()
    renderWithTheme(<SegmentedControl<Opt> options={options} value="week" onChange={onChange} />)
    fireEvent.keyDown(screen.getByRole('radio', { name: '週別' }), { key: 'ArrowUp' })
    expect(onChange).toHaveBeenCalledWith('day')
  })

  it('ArrowRight で最後の option → 最初に循環 (month → day)', () => {
    const onChange = vi.fn()
    renderWithTheme(<SegmentedControl<Opt> options={options} value="month" onChange={onChange} />)
    fireEvent.keyDown(screen.getByRole('radio', { name: '月別' }), { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith('day')
  })

  it('ArrowLeft で最初の option → 最後に循環 (day → month)', () => {
    const onChange = vi.fn()
    renderWithTheme(<SegmentedControl<Opt> options={options} value="day" onChange={onChange} />)
    fireEvent.keyDown(screen.getByRole('radio', { name: '日別' }), { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenCalledWith('month')
  })

  it('Home キーで最初の option に移動', () => {
    const onChange = vi.fn()
    renderWithTheme(<SegmentedControl<Opt> options={options} value="month" onChange={onChange} />)
    fireEvent.keyDown(screen.getByRole('radio', { name: '月別' }), { key: 'Home' })
    expect(onChange).toHaveBeenCalledWith('day')
  })

  it('End キーで最後の option に移動', () => {
    const onChange = vi.fn()
    renderWithTheme(<SegmentedControl<Opt> options={options} value="day" onChange={onChange} />)
    fireEvent.keyDown(screen.getByRole('radio', { name: '日別' }), { key: 'End' })
    expect(onChange).toHaveBeenCalledWith('month')
  })

  it('Tab キー (handler 対象外) では onChange が発火しない', () => {
    const onChange = vi.fn()
    renderWithTheme(<SegmentedControl<Opt> options={options} value="day" onChange={onChange} />)
    fireEvent.keyDown(screen.getByRole('radio', { name: '日別' }), { key: 'Tab' })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('Enter キー (handler 対象外) では onChange が発火しない', () => {
    const onChange = vi.fn()
    renderWithTheme(<SegmentedControl<Opt> options={options} value="day" onChange={onChange} />)
    fireEvent.keyDown(screen.getByRole('radio', { name: '日別' }), { key: 'Enter' })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('value がオプションに存在しない場合 ArrowRight しても onChange 発火しない (defensive)', () => {
    const onChange = vi.fn()
    // 故意に存在しない value を渡してガード分岐を確認
    renderWithTheme(<SegmentedControl options={options} value="invalid" onChange={onChange} />)
    // どの button にも focus せず ArrowRight を発火
    const allRadios = screen.getAllByRole('radio')
    fireEvent.keyDown(allRadios[0], { key: 'ArrowRight' })
    // idx < 0 のとき early return → onChange は呼ばれない
    expect(onChange).not.toHaveBeenCalled()
  })
})
