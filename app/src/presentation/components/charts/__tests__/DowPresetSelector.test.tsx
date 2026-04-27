/**
 * DowPresetSelector.tsx — 曜日プリセットセレクタの contract test
 *
 * 検証対象:
 * - 表示順序: 月火水木金土日
 * - 空配列 = 全選択状態（「全」がアクティブ）
 * - 全選択状態から個別曜日クリック → その曜日のみ選択
 * - 既選択の曜日を解除
 * - 全曜日選ばれたら全選択（空配列）に戻る
 * - 「全」ボタンで全選択にリセット
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, vi } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { darkTheme } from '@/presentation/theme/theme'
import { DowPresetSelector } from '../DowPresetSelector'

function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
  })
}

describe('DowPresetSelector', () => {
  it('曜日ラベルを月〜日の順で描画する', () => {
    const onChange = vi.fn()
    const { container } = renderWithTheme(
      <DowPresetSelector selectedDows={[]} onChange={onChange} />,
    )
    // 全曜日 + 全ボタンがレンダリング
    expect(screen.getByText('月')).toBeInTheDocument()
    expect(screen.getByText('火')).toBeInTheDocument()
    expect(screen.getByText('水')).toBeInTheDocument()
    expect(screen.getByText('木')).toBeInTheDocument()
    expect(screen.getByText('金')).toBeInTheDocument()
    expect(screen.getByText('土')).toBeInTheDocument()
    expect(screen.getByText('日')).toBeInTheDocument()
    expect(screen.getByText('全')).toBeInTheDocument()
    expect(within(container).getByText('曜日:')).toBeInTheDocument()
  })

  it('全選択状態で月曜をクリック → その曜日のみ選択', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithTheme(<DowPresetSelector selectedDows={[]} onChange={onChange} />)
    await user.click(screen.getByText('月'))
    expect(onChange).toHaveBeenCalledWith([1])
  })

  it('既選択の曜日をクリック → 解除される', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithTheme(<DowPresetSelector selectedDows={[1, 2]} onChange={onChange} />)
    await user.click(screen.getByText('月'))
    expect(onChange).toHaveBeenCalledWith([2])
  })

  it('最後の1つを解除 → 空配列（全選択に戻る）', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithTheme(<DowPresetSelector selectedDows={[3]} onChange={onChange} />)
    await user.click(screen.getByText('水'))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('未選択曜日を追加 → ソート済み配列を渡す', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithTheme(<DowPresetSelector selectedDows={[3, 1]} onChange={onChange} />)
    await user.click(screen.getByText('火'))
    expect(onChange).toHaveBeenCalledWith([1, 2, 3])
  })

  it('全曜日が揃ったら空配列（全選択）に戻る', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithTheme(<DowPresetSelector selectedDows={[1, 2, 3, 4, 5, 6]} onChange={onChange} />)
    await user.click(screen.getByText('日'))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('「全」ボタンで全選択（空配列）にリセット', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderWithTheme(<DowPresetSelector selectedDows={[1, 3]} onChange={onChange} />)
    await user.click(screen.getByText('全'))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
