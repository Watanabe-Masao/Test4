import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { VirtualizedList } from '../VirtualizedList'

// テーマモック
const theme = {
  colors: { text4: '#999' },
  typography: { fontSize: { sm: '14px' } },
}

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme as never}>{children}</ThemeProvider>
)

// react-window v2 の List をモック
vi.mock('react-window', () => ({
  List: ({
    rowComponent: Row,
    rowCount,
    rowHeight,
    style,
  }: {
    rowComponent: React.ComponentType<{ index: number; style: React.CSSProperties }>
    rowCount: number
    rowHeight: number
    style: React.CSSProperties
  }) => (
    <div data-testid="virtual-list" data-height={style.height} data-width={style.width} data-item-size={rowHeight}>
      {Array.from({ length: Math.min(rowCount, 10) }, (_, i) => (
        <Row key={i} index={i} style={{ height: rowHeight }} />
      ))}
    </div>
  ),
  useListRef: () => ({ current: null }),
}))

describe('VirtualizedList', () => {
  const items = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }))

  it('データがある場合にリストをレンダリングする', () => {
    render(
      <Wrapper>
        <VirtualizedList
          items={items}
          rowHeight={40}
          height={400}
          renderRow={(item, index, style) => (
            <div key={index} style={style} data-testid={`row-${index}`}>
              {item.name}
            </div>
          )}
        />
      </Wrapper>,
    )

    const list = screen.getByTestId('virtual-list')
    expect(list).toBeTruthy()
    expect(list.getAttribute('data-height')).toBe('400')
    expect(list.getAttribute('data-item-size')).toBe('40')
  })

  it('先頭の行がレンダリングされる', () => {
    render(
      <Wrapper>
        <VirtualizedList
          items={items}
          rowHeight={40}
          height={400}
          renderRow={(item, index, style) => (
            <div key={index} style={style} data-testid={`row-${index}`}>
              {item.name}
            </div>
          )}
        />
      </Wrapper>,
    )

    expect(screen.getByTestId('row-0')).toBeTruthy()
    expect(screen.getByText('Item 0')).toBeTruthy()
  })

  it('空のリストでは空メッセージを表示する', () => {
    render(
      <Wrapper>
        <VirtualizedList
          items={[]}
          rowHeight={40}
          height={400}
          renderRow={() => <div />}
          emptyMessage="表示するデータがありません"
        />
      </Wrapper>,
    )

    expect(screen.getByText('表示するデータがありません')).toBeTruthy()
  })

  it('デフォルトの空メッセージが表示される', () => {
    render(
      <Wrapper>
        <VirtualizedList
          items={[]}
          rowHeight={40}
          height={400}
          renderRow={() => <div />}
        />
      </Wrapper>,
    )

    expect(screen.getByText('データがありません')).toBeTruthy()
  })

  it('カスタム width を設定できる', () => {
    render(
      <Wrapper>
        <VirtualizedList
          items={items}
          rowHeight={40}
          height={400}
          width={800}
          renderRow={(item, index, style) => (
            <div key={index} style={style}>
              {item.name}
            </div>
          )}
        />
      </Wrapper>,
    )

    const list = screen.getByTestId('virtual-list')
    expect(list.getAttribute('data-width')).toBe('800')
  })

  it('モック: 最大10行のみレンダリングされる (仮想化の模倣)', () => {
    render(
      <Wrapper>
        <VirtualizedList
          items={items}
          rowHeight={40}
          height={400}
          renderRow={(item, index, style) => (
            <div key={index} style={style} data-testid={`row-${index}`}>
              {item.name}
            </div>
          )}
        />
      </Wrapper>,
    )

    // モックは最大10行しかレンダリングしない → 100行のうちDOM上には10行
    expect(screen.getByTestId('row-9')).toBeTruthy()
    expect(screen.queryByTestId('row-10')).toBeNull()
  })
})
