/**
 * Chip.tsx — Chip / ChipGroup の contract test
 *
 * 検証対象:
 * - Chip: button ロールで描画される
 * - $active prop で描画エラーなく通る
 * - ChipGroup: 複数 Chip を wrapper として包む
 * - onClick が呼ばれる
 * - disabled 時は onClick が呼ばれない
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, vi } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { darkTheme } from '@/presentation/theme/theme'
import { Chip, ChipGroup } from '../Chip'

function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
  })
}

describe('Chip', () => {
  it('button ロールとして描画される', () => {
    renderWithTheme(<Chip>全期間</Chip>)
    expect(screen.getByRole('button', { name: '全期間' })).toBeInTheDocument()
  })

  it('$active prop で描画エラーなく通る', () => {
    renderWithTheme(<Chip $active>アクティブ</Chip>)
    expect(screen.getByRole('button', { name: 'アクティブ' })).toBeInTheDocument()
  })

  it('$active 未指定でも描画できる', () => {
    renderWithTheme(<Chip>非アクティブ</Chip>)
    expect(screen.getByRole('button', { name: '非アクティブ' })).toBeInTheDocument()
  })

  it('onClick ハンドラが呼ばれる', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    renderWithTheme(<Chip onClick={onClick}>click me</Chip>)
    await user.click(screen.getByRole('button', { name: 'click me' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('disabled 時は onClick が呼ばれない', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    renderWithTheme(
      <Chip onClick={onClick} disabled>
        無効
      </Chip>,
    )
    await user.click(screen.getByRole('button', { name: '無効' }))
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('ChipGroup', () => {
  it('複数の Chip を内包して描画する', () => {
    renderWithTheme(
      <ChipGroup>
        <Chip>1週間</Chip>
        <Chip $active>1ヶ月</Chip>
        <Chip>3ヶ月</Chip>
      </ChipGroup>,
    )
    expect(screen.getByRole('button', { name: '1週間' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1ヶ月' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '3ヶ月' })).toBeInTheDocument()
  })

  it('空の ChipGroup でもクラッシュしない', () => {
    const { container } = renderWithTheme(<ChipGroup />)
    expect(container.firstChild).not.toBeNull()
  })
})
