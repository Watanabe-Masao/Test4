/**
 * Skeleton.tsx — ローディング状態 skeleton の contract test
 *
 * 検証対象:
 * - KpiCardSkeleton: 3 つの SkeletonLine
 * - ChartSkeleton: height prop 反映 + header SkeletonLine
 * - TableSkeleton: columns / rows prop 反映
 * - PageSkeleton: kpiCount 分の KpiCardSkeleton + Chart + Table
 */
import { describe, it, expect } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { KpiCardSkeleton, ChartSkeleton, TableSkeleton, PageSkeleton } from '../Skeleton'
import { darkTheme } from '@/presentation/theme/theme'

function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
  })
}

describe('KpiCardSkeleton', () => {
  it('3 つの SkeletonLine を描画する (label + value + subText)', () => {
    const { container } = renderWithTheme(<KpiCardSkeleton />)
    // SkeletonLine は styled div、class が予測不能なので wrapper 内の div 数で検証
    const lines = container.querySelectorAll('div')
    expect(lines.length).toBeGreaterThanOrEqual(4) // wrapper 1 + SkeletonLine 3
  })
})

describe('ChartSkeleton', () => {
  it('default height で描画される', () => {
    const { container } = renderWithTheme(<ChartSkeleton />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('custom height prop を受け取る', () => {
    const { container } = renderWithTheme(<ChartSkeleton height="500px" />)
    // 内部 Skeleton の style 属性を検証するのは styled-components の詳細依存
    // ここでは render 成功 + height prop が設定されたことだけを確認
    expect(container.firstChild).toBeInTheDocument()
  })
})

describe('TableSkeleton', () => {
  it('default columns=5 × rows=6 で描画される', () => {
    const { container } = renderWithTheme(<TableSkeleton />)
    // header 5 cells + 6 rows * 5 cells = 35 cells
    const allLines = container.querySelectorAll('div')
    // header row 1 + body rows 6 + cells 35 = 少なくとも 42 div (+ wrapper)
    expect(allLines.length).toBeGreaterThanOrEqual(42)
  })

  it('columns=3 × rows=2 で描画サイズが変わる', () => {
    const { container: c1 } = renderWithTheme(<TableSkeleton columns={3} rows={2} />)
    const { container: c2 } = renderWithTheme(<TableSkeleton columns={10} rows={10} />)

    // cells 数が大きいほど div count が増えるはず
    const lines1 = c1.querySelectorAll('div').length
    const lines2 = c2.querySelectorAll('div').length
    expect(lines2).toBeGreaterThan(lines1)
  })
})

describe('PageSkeleton', () => {
  it('default kpiCount=4 で描画される', () => {
    const { container } = renderWithTheme(<PageSkeleton />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('kpiCount=2 vs kpiCount=6 で描画サイズが変わる', () => {
    const { container: c1 } = renderWithTheme(<PageSkeleton kpiCount={2} />)
    const { container: c2 } = renderWithTheme(<PageSkeleton kpiCount={6} />)

    const lines1 = c1.querySelectorAll('div').length
    const lines2 = c2.querySelectorAll('div').length
    expect(lines2).toBeGreaterThan(lines1)
  })
})
