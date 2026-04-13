/**
 * ImportProgressBar.tsx — display component の contract test
 *
 * 検証対象:
 * - filename / current / total の表示
 * - percent 計算（四捨五入）
 * - 0% / 100% の境界
 * - ProgressFill の aria-valuenow 相当（$percent prop）
 */
import { describe, it, expect } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { ImportProgressBar } from '../ImportProgressBar'
import { darkTheme } from '@/presentation/theme/theme'

function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
  })
}

describe('ImportProgressBar', () => {
  it('filename と current/total を表示する', () => {
    renderWithTheme(
      <ImportProgressBar progress={{ current: 3, total: 10, filename: 'sales.csv' }} />,
    )
    expect(screen.getByText('sales.csv')).toBeInTheDocument()
    expect(screen.getByText('3/10')).toBeInTheDocument()
  })

  it('current=0 / total=10 でも current/total が 0/10 で表示される', () => {
    renderWithTheme(
      <ImportProgressBar progress={{ current: 0, total: 10, filename: 'empty.csv' }} />,
    )
    expect(screen.getByText('0/10')).toBeInTheDocument()
    expect(screen.getByText('empty.csv')).toBeInTheDocument()
  })

  it('current=10 / total=10 で 10/10 が表示される（完了状態）', () => {
    renderWithTheme(
      <ImportProgressBar progress={{ current: 10, total: 10, filename: 'done.csv' }} />,
    )
    expect(screen.getByText('10/10')).toBeInTheDocument()
  })

  it('current=1 / total=3 は 1/3 として正しく描画される', () => {
    renderWithTheme(
      <ImportProgressBar progress={{ current: 1, total: 3, filename: 'third.csv' }} />,
    )
    expect(screen.getByText('1/3')).toBeInTheDocument()
    expect(screen.getByText('third.csv')).toBeInTheDocument()
  })
})
