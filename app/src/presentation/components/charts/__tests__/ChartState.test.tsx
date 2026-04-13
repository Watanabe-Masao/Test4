/**
 * ChartState.tsx — ChartLoading / ChartError / ChartEmpty の contract test
 *
 * 検証対象:
 * - ChartError: message を表示
 * - ChartEmpty: message（指定）/ デフォルト ('データがありません') 表示
 * - ChartLoading: ChartSkeleton の描画（height prop を受け取る）
 */
import { describe, it, expect } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { darkTheme } from '@/presentation/theme/theme'
import { ChartError, ChartEmpty, ChartLoading } from '../ChartState'

function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
  })
}

describe('ChartState', () => {
  describe('ChartError', () => {
    it('message を表示する', () => {
      renderWithTheme(<ChartError message="計算に失敗しました" />)
      expect(screen.getByText('計算に失敗しました')).toBeInTheDocument()
    })

    it('空文字列でもクラッシュしない', () => {
      const { container } = renderWithTheme(<ChartError message="" />)
      expect(container.firstChild).not.toBeNull()
    })

    it('height prop を受け取っても描画する', () => {
      renderWithTheme(<ChartError message="エラー" height={300} />)
      expect(screen.getByText('エラー')).toBeInTheDocument()
    })
  })

  describe('ChartEmpty', () => {
    it('message 未指定時はデフォルトメッセージを表示する', () => {
      renderWithTheme(<ChartEmpty />)
      expect(screen.getByText('データがありません')).toBeInTheDocument()
    })

    it('message 指定時はそれを表示する', () => {
      renderWithTheme(<ChartEmpty message="期間内に売上なし" />)
      expect(screen.getByText('期間内に売上なし')).toBeInTheDocument()
      expect(screen.queryByText('データがありません')).not.toBeInTheDocument()
    })

    it('height prop を受け取っても描画する', () => {
      const { container } = renderWithTheme(<ChartEmpty height={150} />)
      expect(container.firstChild).not.toBeNull()
    })
  })

  describe('ChartLoading', () => {
    it('何らかの DOM を出力する（ChartSkeleton）', () => {
      const { container } = renderWithTheme(<ChartLoading />)
      expect(container.firstChild).not.toBeNull()
    })

    it('height prop を受け取っても描画する', () => {
      const { container } = renderWithTheme(<ChartLoading height={400} />)
      expect(container.firstChild).not.toBeNull()
    })
  })
})
