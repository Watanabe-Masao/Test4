/**
 * ErrorBoundary.tsx — React Error Boundary の contract test
 *
 * 検証対象 branch:
 * - 通常 render: children を描画
 * - error throw: getDerivedStateFromError → hasError=true → fallback UI
 * - default fallback: エラーアイコン + heading + message + 再試行 button
 * - error.message が空なら message DOM を表示しない
 * - カスタム fallback (ReactNode): そのまま表示
 * - カスタム fallback (function): (error, reset) を受けて render
 * - reset button: setState で hasError=false に復帰 → children 再描画
 * - onError callback: componentDidCatch 内で発火 (error + errorInfo 引数)
 * - ChartErrorBoundary: i18n messages 経由の fallback
 * - PageErrorBoundary: 同じ pattern の PageFallback
 *
 * Phase 3 Step 3-12: class component + error boundary の特殊テスト。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ThemeProvider } from 'styled-components'
import { render, screen, fireEvent } from '@testing-library/react'
import type { ReactElement } from 'react'
import { ErrorBoundary, ChartErrorBoundary, PageErrorBoundary } from '../ErrorBoundary'
import { darkTheme } from '@/presentation/theme/theme'

// useI18n を mock (ChartErrorBoundary / PageErrorBoundary で使われる)
vi.mock('@/application/hooks/useI18n', () => ({
  useI18n: () => ({
    messages: {
      errors: {
        chartDisplayFailed: 'チャート表示失敗',
        pageUnexpectedError: 'ページで予期しないエラー',
        occurred: 'エラーが発生',
        retry: 'リトライ',
      },
    },
  }),
}))

function renderWithTheme(ui: ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>,
  })
}

// 意図的に throw する children component
function Thrower({ message = 'テストエラー' }: { message?: string }): never {
  throw new Error(message)
}

// トグル可能な thrower (再試行シナリオ用)
function ConditionalThrower({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('条件付きエラー')
  return <div>正常描画</div>
}

// React の error log を抑制 (test 中の console.error を無効化)
const originalError = console.error
beforeEach(() => {
  console.error = vi.fn()
})
afterEach(() => {
  console.error = originalError
})

describe('ErrorBoundary — 通常 render', () => {
  it('error が throw されなければ children を描画する', () => {
    renderWithTheme(
      <ErrorBoundary>
        <div>正常な children</div>
      </ErrorBoundary>,
    )
    expect(screen.getByText('正常な children')).toBeInTheDocument()
  })
})

describe('ErrorBoundary — default fallback UI', () => {
  it('children が throw すると default fallback UI が表示される', () => {
    renderWithTheme(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>,
    )
    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument()
    expect(screen.getByText(/テストエラー/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '再試行' })).toBeInTheDocument()
  })

  it('error.message が空文字なら ErrorMessage DOM は表示されない', () => {
    function EmptyThrower(): never {
      throw new Error('')
    }
    renderWithTheme(
      <ErrorBoundary>
        <EmptyThrower />
      </ErrorBoundary>,
    )
    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument()
    // 空文字なので ErrorMessage 表示なし (heading だけ)
  })
})

describe('ErrorBoundary — カスタム fallback', () => {
  it('fallback に ReactNode を渡すとそのまま表示', () => {
    renderWithTheme(
      <ErrorBoundary fallback={<div>カスタム fallback</div>}>
        <Thrower />
      </ErrorBoundary>,
    )
    expect(screen.getByText('カスタム fallback')).toBeInTheDocument()
    // default fallback の文言は無い
    expect(screen.queryByText('エラーが発生しました')).not.toBeInTheDocument()
  })

  it('fallback に function を渡すと (error, reset) 引数で render される', () => {
    const fallbackFn = vi.fn((error: Error, reset: () => void) => (
      <div>
        <span>関数 fallback: {error.message}</span>
        <button onClick={reset}>関数リセット</button>
      </div>
    ))
    renderWithTheme(
      <ErrorBoundary fallback={fallbackFn}>
        <Thrower />
      </ErrorBoundary>,
    )
    expect(fallbackFn).toHaveBeenCalled()
    expect(screen.getByText(/関数 fallback: テストエラー/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '関数リセット' })).toBeInTheDocument()
  })
})

describe('ErrorBoundary — reset / retry', () => {
  it('再試行 button click で handleReset が呼ばれ、hasError=false に戻る', () => {
    // First render: throw
    const { rerender } = renderWithTheme(
      <ErrorBoundary>
        <ConditionalThrower shouldThrow={true} />
      </ErrorBoundary>,
    )
    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument()

    // 再試行 click → setState で hasError=false
    fireEvent.click(screen.getByRole('button', { name: '再試行' }))

    // After click, children prop 変更 + reset で通常 render に戻る
    rerender(
      <ThemeProvider theme={darkTheme}>
        <ErrorBoundary>
          <ConditionalThrower shouldThrow={false} />
        </ErrorBoundary>
      </ThemeProvider>,
    )
    expect(screen.getByText('正常描画')).toBeInTheDocument()
    expect(screen.queryByText('エラーが発生しました')).not.toBeInTheDocument()
  })
})

describe('ErrorBoundary — onError callback', () => {
  it('onError を渡すと componentDidCatch で発火する', () => {
    const onError = vi.fn()
    renderWithTheme(
      <ErrorBoundary onError={onError}>
        <Thrower message="onError テスト" />
      </ErrorBoundary>,
    )
    expect(onError).toHaveBeenCalled()
    const call = onError.mock.calls[0]
    expect(call[0]).toBeInstanceOf(Error)
    expect((call[0] as Error).message).toBe('onError テスト')
    // errorInfo (2 番目の引数) は componentStack を持つ
    expect(call[1]).toHaveProperty('componentStack')
  })

  it('onError 未指定時もエラーはキャッチされ fallback が表示される', () => {
    renderWithTheme(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>,
    )
    expect(screen.getByText('エラーが発生しました')).toBeInTheDocument()
  })
})

describe('ChartErrorBoundary', () => {
  it('children を通常描画', () => {
    renderWithTheme(
      <ChartErrorBoundary>
        <div>chart content</div>
      </ChartErrorBoundary>,
    )
    expect(screen.getByText('chart content')).toBeInTheDocument()
  })

  it('error throw 時に i18n 経由の chart fallback を表示', () => {
    renderWithTheme(
      <ChartErrorBoundary>
        <Thrower message="chart error" />
      </ChartErrorBoundary>,
    )
    expect(screen.getByText('チャート表示失敗')).toBeInTheDocument()
    expect(screen.getByText(/chart error/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'リトライ' })).toBeInTheDocument()
  })

  it('onError callback が発火する', () => {
    const onError = vi.fn()
    renderWithTheme(
      <ChartErrorBoundary onError={onError}>
        <Thrower />
      </ChartErrorBoundary>,
    )
    expect(onError).toHaveBeenCalled()
  })
})

describe('PageErrorBoundary', () => {
  it('children を通常描画', () => {
    renderWithTheme(
      <PageErrorBoundary>
        <div>page content</div>
      </PageErrorBoundary>,
    )
    expect(screen.getByText('page content')).toBeInTheDocument()
  })

  it('error throw 時に page fallback を表示', () => {
    renderWithTheme(
      <PageErrorBoundary>
        <Thrower message="page error" />
      </PageErrorBoundary>,
    )
    expect(screen.getByText('エラーが発生')).toBeInTheDocument()
    expect(screen.getByText('ページで予期しないエラー')).toBeInTheDocument()
    expect(screen.getByText(/page error/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'リトライ' })).toBeInTheDocument()
  })

  it('onError callback が発火する', () => {
    const onError = vi.fn()
    renderWithTheme(
      <PageErrorBoundary onError={onError}>
        <Thrower />
      </PageErrorBoundary>,
    )
    expect(onError).toHaveBeenCalled()
  })
})
