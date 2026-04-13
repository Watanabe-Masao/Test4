/**
 * ChartToolbar.tsx — コンテナコンポーネントの contract test
 *
 * 検証対象:
 * - children をそのまま描画
 * - ToolbarGroup / ToolbarLabel の re-export が機能
 */
import { describe, it, expect } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { darkTheme } from '@/presentation/theme/theme'
import { ChartToolbar, ToolbarGroup, ToolbarLabel } from '../ChartToolbar'

function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
  })
}

describe('ChartToolbar', () => {
  it('children をそのまま描画する', () => {
    renderWithTheme(
      <ChartToolbar>
        <span>子要素1</span>
        <span>子要素2</span>
      </ChartToolbar>,
    )
    expect(screen.getByText('子要素1')).toBeInTheDocument()
    expect(screen.getByText('子要素2')).toBeInTheDocument()
  })

  it('ToolbarGroup と ToolbarLabel を組み合わせて使える', () => {
    renderWithTheme(
      <ChartToolbar>
        <ToolbarGroup>
          <ToolbarLabel>期間:</ToolbarLabel>
          <button>月次</button>
        </ToolbarGroup>
      </ChartToolbar>,
    )
    expect(screen.getByText('期間:')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '月次' })).toBeInTheDocument()
  })

  it('空の children でもクラッシュしない', () => {
    const { container } = renderWithTheme(<ChartToolbar>{null}</ChartToolbar>)
    expect(container.firstChild).not.toBeNull()
  })
})
