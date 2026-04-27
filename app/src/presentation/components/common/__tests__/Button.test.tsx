/**
 * Button.tsx — styled-components Button の contract test
 *
 * 検証対象:
 * - default variant で描画
 * - children テキストを表示
 * - onClick が disabled 時は呼ばれない
 * - type prop が DOM に伝わる
 * - $variant / $fullWidth variants が render エラーなく通る
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, vi } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { darkTheme } from '@/presentation/theme/theme'
import { Button } from '../Button'

function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
  })
}

describe('Button', () => {
  it('children テキストを表示する', () => {
    renderWithTheme(<Button>保存</Button>)
    expect(screen.getByRole('button', { name: '保存' })).toBeInTheDocument()
  })

  it('onClick ハンドラが呼ばれる', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    renderWithTheme(<Button onClick={onClick}>クリック</Button>)
    await user.click(screen.getByRole('button', { name: 'クリック' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('disabled 時は onClick が呼ばれない', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    renderWithTheme(
      <Button onClick={onClick} disabled>
        無効
      </Button>,
    )
    const btn = screen.getByRole('button', { name: '無効' })
    expect(btn).toBeDisabled()
    await user.click(btn)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('type=submit を受け付ける', () => {
    renderWithTheme(<Button type="submit">送信</Button>)
    expect(screen.getByRole('button', { name: '送信' })).toHaveAttribute('type', 'submit')
  })

  it.each(['primary', 'success', 'outline', 'ghost'] as const)(
    '$variant=%s で描画エラーなく通る',
    (variant) => {
      renderWithTheme(<Button $variant={variant}>{variant}</Button>)
      expect(screen.getByRole('button', { name: variant })).toBeInTheDocument()
    },
  )

  it('$fullWidth=true で描画エラーなく通る', () => {
    renderWithTheme(<Button $fullWidth>幅いっぱい</Button>)
    expect(screen.getByRole('button', { name: '幅いっぱい' })).toBeInTheDocument()
  })
})
