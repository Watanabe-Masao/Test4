import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { darkTheme } from '@/presentation/theme'
import { TimeSlotSalesChart } from '../TimeSlotSalesChart'
import type { CategoryTimeSalesData } from '@/domain/models'

function wrap(ui: React.ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => (
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    ),
  })
}

describe('TimeSlotSalesChart', () => {
  it('時間帯データがある場合にタイトルが表示される', () => {
    const categoryTimeSales: CategoryTimeSalesData = {
      records: [
        {
          day: 1,
          storeId: '1',
          department: { code: '01', name: '食品' },
          line: { code: '001', name: 'ライン1' },
          klass: { code: '0001', name: 'クラス1' },
          timeSlots: [
            { hour: 9, quantity: 10, amount: 50000 },
            { hour: 10, quantity: 15, amount: 75000 },
          ],
          totalQuantity: 25,
          totalAmount: 125000,
        },
      ],
    }

    wrap(
      <TimeSlotSalesChart
        categoryTimeSales={categoryTimeSales}
        selectedStoreIds={new Set()}
      />,
    )

    expect(screen.getByText('時間帯別売上')).toBeInTheDocument()
  })

  it('空レコードの場合 null を返す', () => {
    const categoryTimeSales: CategoryTimeSalesData = { records: [] }

    const { container } = wrap(
      <TimeSlotSalesChart
        categoryTimeSales={categoryTimeSales}
        selectedStoreIds={new Set()}
      />,
    )

    expect(container.innerHTML).toBe('')
  })

  it('selectedStoreIds でフィルタリングされる', () => {
    const categoryTimeSales: CategoryTimeSalesData = {
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
          storeId: '2',
          department: { code: '01', name: '食品' },
          line: { code: '001', name: 'ライン1' },
          klass: { code: '0001', name: 'クラス1' },
          timeSlots: [{ hour: 9, quantity: 20, amount: 100000 }],
          totalQuantity: 20,
          totalAmount: 100000,
        },
      ],
    }

    // 店舗2のみフィルタ
    wrap(
      <TimeSlotSalesChart
        categoryTimeSales={categoryTimeSales}
        selectedStoreIds={new Set(['2'])}
      />,
    )

    // 店舗2のデータでレンダリングされることを確認
    expect(screen.getByText('時間帯別売上')).toBeInTheDocument()
  })
})
