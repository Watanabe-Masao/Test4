/**
 * Card.tsx — Card / CardTitle の contract test
 *
 * 検証対象:
 * - Card: children を描画
 * - $accent prop で描画エラーなく通る
 * - CardTitle: children を h3 として描画
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { darkTheme } from '@/presentation/theme/theme'
import { Card, CardTitle } from '../Card'

function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
  })
}

describe('Card', () => {
  it('children を描画する', () => {
    renderWithTheme(
      <Card>
        <span>内容テキスト</span>
      </Card>,
    )
    expect(screen.getByText('内容テキスト')).toBeInTheDocument()
  })

  it('$accent prop を受け取って描画エラーなく通る', () => {
    renderWithTheme(<Card $accent="#ff0000">アクセント付き</Card>)
    expect(screen.getByText('アクセント付き')).toBeInTheDocument()
  })

  it('$accent 未指定でも描画できる', () => {
    renderWithTheme(<Card>デフォルト</Card>)
    expect(screen.getByText('デフォルト')).toBeInTheDocument()
  })
})

describe('CardTitle', () => {
  it('h3 要素として描画される', () => {
    renderWithTheme(<CardTitle>売上サマリ</CardTitle>)
    const heading = screen.getByRole('heading', { level: 3, name: '売上サマリ' })
    expect(heading).toBeInTheDocument()
  })

  it('Card 内に配置しても正しく描画される', () => {
    renderWithTheme(
      <Card>
        <CardTitle>タイトル</CardTitle>
        <p>本文</p>
      </Card>,
    )
    expect(screen.getByRole('heading', { level: 3, name: 'タイトル' })).toBeInTheDocument()
    expect(screen.getByText('本文')).toBeInTheDocument()
  })
})
