import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { darkTheme } from '@/presentation/theme'
import { CategorySalesBreakdownChart } from '../CategorySalesBreakdownChart'
import type { CategoryTimeSalesData } from '@/domain/models'

function wrap(ui: React.ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => (
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    ),
  })
}

const sampleData: CategoryTimeSalesData = {
  records: [
    {
      day: 1,
      storeId: '1',
      department: { code: '01', name: '食品' },
      line: { code: '001', name: 'ライン1' },
      klass: { code: '0001', name: 'クラス1' },
      timeSlots: [{ hour: 9, quantity: 10, amount: 50000 }],
      totalQuantity: 10,
      totalAmount: 50000,
    },
    {
      day: 1,
      storeId: '1',
      department: { code: '02', name: '日用品' },
      line: { code: '002', name: 'ライン2' },
      klass: { code: '0002', name: 'クラス2' },
      timeSlots: [{ hour: 10, quantity: 20, amount: 100000 }],
      totalQuantity: 20,
      totalAmount: 100000,
    },
  ],
}

describe('CategorySalesBreakdownChart', () => {
  it('部門別売上がデフォルトで表示される', () => {
    wrap(
      <CategorySalesBreakdownChart
        categoryTimeSales={sampleData}
        selectedStoreIds={new Set()}
      />,
    )

    expect(screen.getByText('部門別売上')).toBeInTheDocument()
  })

  it('タブ切替でライン別表示に変わる', () => {
    wrap(
      <CategorySalesBreakdownChart
        categoryTimeSales={sampleData}
        selectedStoreIds={new Set()}
      />,
    )

    // ライン タブをクリック
    fireEvent.click(screen.getByText('ライン'))

    expect(screen.getByText('ライン別売上')).toBeInTheDocument()
  })

  it('タブ切替でクラス別表示に変わる', () => {
    wrap(
      <CategorySalesBreakdownChart
        categoryTimeSales={sampleData}
        selectedStoreIds={new Set()}
      />,
    )

    fireEvent.click(screen.getByText('クラス'))

    expect(screen.getByText('クラス別売上')).toBeInTheDocument()
  })

  it('空レコードの場合 null を返す', () => {
    const emptyData: CategoryTimeSalesData = { records: [] }

    const { container } = wrap(
      <CategorySalesBreakdownChart
        categoryTimeSales={emptyData}
        selectedStoreIds={new Set()}
      />,
    )

    expect(container.innerHTML).toBe('')
  })

  it('店舗フィルタが適用される', () => {
    const data: CategoryTimeSalesData = {
      records: [
        {
          day: 1,
          storeId: '1',
          department: { code: '01', name: '食品' },
          line: { code: '001', name: 'ライン1' },
          klass: { code: '0001', name: 'クラス1' },
          timeSlots: [],
          totalQuantity: 10,
          totalAmount: 50000,
        },
        {
          day: 1,
          storeId: '2',
          department: { code: '01', name: '食品' },
          line: { code: '001', name: 'ライン1' },
          klass: { code: '0001', name: 'クラス1' },
          timeSlots: [],
          totalQuantity: 30,
          totalAmount: 150000,
        },
      ],
    }

    // 存在しない店舗でフィルタすると空になる
    const { container } = wrap(
      <CategorySalesBreakdownChart
        categoryTimeSales={data}
        selectedStoreIds={new Set(['999'])}
      />,
    )

    expect(container.innerHTML).toBe('')
  })
})
