/**
 * pin-intervals-wasm 型付きモック（candidate: BIZ-011）
 */
import { calculatePinIntervals } from '@/domain/calculations/pinIntervals'
import type { DailyRecord } from '@/domain/models/record'

export default function init(): Promise<void> {
  return Promise.resolve()
}

export function calculate_pin_intervals(
  dailySales: Float64Array,
  dailyTotalCost: Float64Array,
  openingInventory: number,
  pinDays: Int32Array,
  pinClosingInventory: Float64Array,
  daysInMonth: number,
): Float64Array {
  void daysInMonth // FFI contract parameter (TS impl derives from pins)
  // Reconstruct Map for TS reference — minimal DailyRecord stub
  const daily = new Map<number, DailyRecord>()
  for (let i = 0; i < dailySales.length; i++) {
    if (dailySales[i] !== 0 || dailyTotalCost[i] !== 0) {
      daily.set(i + 1, {
        day: i + 1,
        sales: dailySales[i],
        // Stub: put all cost into purchase.cost for getDailyTotalCost parity
        purchase: { cost: dailyTotalCost[i], price: 0 },
        interStoreIn: { cost: 0, price: 0 },
        interStoreOut: { cost: 0, price: 0 },
        interDepartmentIn: { cost: 0, price: 0 },
        interDepartmentOut: { cost: 0, price: 0 },
        flowers: { cost: 0, price: 0 },
        directProduce: { cost: 0, price: 0 },
        costInclusion: { cost: 0 },
        discountAmount: 0,
        discountEntries: [],
        supplierBreakdown: new Map(),
        coreSales: dailySales[i],
        grossSales: dailySales[i],
        totalCost: dailyTotalCost[i],
        deliverySales: { cost: 0, price: 0 },
        discountAbsolute: 0,
      } as unknown as DailyRecord)
    }
  }

  const pins: [number, number][] = []
  for (let i = 0; i < pinDays.length; i++) {
    pins.push([pinDays[i], pinClosingInventory[i]])
  }

  const opening = Number.isNaN(openingInventory) ? null : openingInventory
  const results = calculatePinIntervals(daily, opening, pins)

  const arr = new Float64Array(results.length * 9)
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    const off = i * 9
    arr[off] = r.startDay
    arr[off + 1] = r.endDay
    arr[off + 2] = r.openingInventory
    arr[off + 3] = r.closingInventory
    arr[off + 4] = r.totalSales
    arr[off + 5] = r.totalPurchaseCost
    arr[off + 6] = r.cogs
    arr[off + 7] = r.grossProfit
    arr[off + 8] = r.grossProfitRate
  }
  return arr
}
