import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ThemeProvider } from 'styled-components'
import { darkTheme } from '@/presentation/theme'
import { CustomerTrendChart } from '../CustomerTrendChart'
import type { DailyRecord } from '@/domain/models'
import type { PrevYearDailyEntry } from '@/application/hooks'

function wrap(ui: React.ReactElement) {
  return render(ui, {
    wrapper: ({ children }) => (
      <ThemeProvider theme={darkTheme}>{children}</ThemeProvider>
    ),
  })
}

function makeDailyRecord(day: number, customers: number): DailyRecord {
  return {
    day,
    sales: customers * 2000,
    coreSales: customers * 2000,
    grossSales: customers * 2000,
    purchase: { cost: 0, price: 0 },
    deliverySales: { cost: 0, price: 0 },
    interStoreIn: { cost: 0, price: 0 },
    interStoreOut: { cost: 0, price: 0 },
    interDepartmentIn: { cost: 0, price: 0 },
    interDepartmentOut: { cost: 0, price: 0 },
    flowers: { cost: 0, price: 0 },
    directProduce: { cost: 0, price: 0 },
    consumable: { cost: 0, items: [] },
    customers,
    discountAmount: 0,
    discountAbsolute: 0,
    supplierBreakdown: new Map(),
    transferBreakdown: {
      interStoreIn: [],
      interStoreOut: [],
      interDepartmentIn: [],
      interDepartmentOut: [],
    },
  }
}

describe('CustomerTrendChart', () => {
  it('客数データがある場合にタイトルが表示される', () => {
    const daily = new Map<number, DailyRecord>([
      [1, makeDailyRecord(1, 50)],
      [2, makeDailyRecord(2, 60)],
    ])

    wrap(<CustomerTrendChart daily={daily} daysInMonth={28} />)

    expect(screen.getByText('日別客数推移')).toBeInTheDocument()
  })

  it('前年データがある場合にタイトルに前年比較が付く', () => {
    const daily = new Map<number, DailyRecord>([
      [1, makeDailyRecord(1, 50)],
    ])
    const prevYearDaily = new Map<number, PrevYearDailyEntry>([
      [1, { sales: 90000, discount: 500, customers: 45 }],
    ])

    wrap(<CustomerTrendChart daily={daily} daysInMonth={28} prevYearDaily={prevYearDaily} />)

    expect(screen.getByText('日別客数推移（前年比較）')).toBeInTheDocument()
  })

  it('客数がすべて 0 なら null を返す', () => {
    const daily = new Map<number, DailyRecord>([
      [1, makeDailyRecord(1, 0)],
    ])

    const { container } = wrap(<CustomerTrendChart daily={daily} daysInMonth={28} />)

    expect(container.innerHTML).toBe('')
  })
})
