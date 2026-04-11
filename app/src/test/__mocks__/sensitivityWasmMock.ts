/**
 * sensitivity-wasm 型付きモック（candidate: ANA-003）
 */
import {
  calculateSensitivity,
  calculateElasticity,
} from '@/domain/calculations/algorithms/sensitivity'
import type { SensitivityBase } from '@/domain/calculations/algorithms/sensitivity'

export default function init(): Promise<void> {
  return Promise.resolve()
}

export function calculate_sensitivity(
  totalSales: number,
  totalCost: number,
  totalDiscount: number,
  grossSales: number,
  totalCustomers: number,
  totalCostInclusion: number,
  averageMarkupRate: number,
  budget: number,
  elapsedDays: number,
  salesDays: number,
  discountRateDelta: number,
  customersDelta: number,
  transactionValueDelta: number,
  costRateDelta: number,
): Float64Array {
  const r = calculateSensitivity(
    {
      totalSales,
      totalCost,
      totalDiscount,
      grossSales,
      totalCustomers,
      totalCostInclusion,
      averageMarkupRate,
      budget,
      elapsedDays,
      salesDays,
    },
    { discountRateDelta, customersDelta, transactionValueDelta, costRateDelta },
  )
  const arr = new Float64Array(10)
  arr[0] = r.baseGrossProfit
  arr[1] = r.baseGrossProfitRate
  arr[2] = r.simulatedGrossProfit
  arr[3] = r.simulatedGrossProfitRate
  arr[4] = r.grossProfitDelta
  arr[5] = r.simulatedSales
  arr[6] = r.salesDelta
  arr[7] = r.simulatedProjectedSales
  arr[8] = r.projectedSalesDelta
  arr[9] = r.budgetAchievementDelta
  return arr
}

export function calculate_elasticity(
  totalSales: number,
  totalCost: number,
  totalDiscount: number,
  grossSales: number,
  totalCustomers: number,
  totalCostInclusion: number,
  averageMarkupRate: number,
  budget: number,
  elapsedDays: number,
  salesDays: number,
): Float64Array {
  const base: SensitivityBase = {
    totalSales,
    totalCost,
    totalDiscount,
    grossSales,
    totalCustomers,
    totalCostInclusion,
    averageMarkupRate,
    budget,
    elapsedDays,
    salesDays,
  }
  const r = calculateElasticity(base)
  const arr = new Float64Array(4)
  arr[0] = r.discountRateElasticity
  arr[1] = r.customersElasticity
  arr[2] = r.transactionValueElasticity
  arr[3] = r.costRateElasticity
  return arr
}
