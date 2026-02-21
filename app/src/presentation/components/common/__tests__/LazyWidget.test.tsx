import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { LazyWidget } from '../LazyWidget'

// テーマモック
const theme = {
  colors: { bg2: '#f5f5f5', border: '#ddd', text4: '#999' },
  radii: { lg: '8px' },
  typography: { fontSize: { xs: '12px' } },
}

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme as never}>{children}</ThemeProvider>
)

// useIntersectionObserver モック
let mockHasBeenVisible = false
vi.mock('@/presentation/hooks/useIntersectionObserver', () => ({
  useIntersectionObserver: () => ({
    ref: vi.fn(),
    isIntersecting: mockHasBeenVisible,
    hasBeenVisible: mockHasBeenVisible,
  }),
}))

describe('LazyWidget', () => {
  it('初期状態ではプレースホルダーを表示する', () => {
    mockHasBeenVisible = false
    render(
      <Wrapper>
        <LazyWidget>
          <div data-testid="child">コンテンツ</div>
        </LazyWidget>
      </Wrapper>,
    )

    expect(screen.queryByTestId('child')).toBeNull()
    expect(screen.getByText('...')).toBeTruthy()
  })

  it('表示可能になると子要素をレンダリングする', () => {
    mockHasBeenVisible = true
    render(
      <Wrapper>
        <LazyWidget>
          <div data-testid="child">コンテンツ</div>
        </LazyWidget>
      </Wrapper>,
    )

    expect(screen.getByTestId('child')).toBeTruthy()
    expect(screen.getByText('コンテンツ')).toBeTruthy()
  })

  it('カスタムプレースホルダーを表示できる', () => {
    mockHasBeenVisible = false
    render(
      <Wrapper>
        <LazyWidget placeholder={<div>読み込み中...</div>}>
          <div>コンテンツ</div>
        </LazyWidget>
      </Wrapper>,
    )

    expect(screen.getByText('読み込み中...')).toBeTruthy()
    expect(screen.queryByText('コンテンツ')).toBeNull()
  })
})
