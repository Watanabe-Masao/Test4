/**
 * sensitivity WASM wrapper (candidate)
 * @contractId ANA-003
 * @semanticClass analytic
 * @authorityKind candidate-authoritative
 */
import type {
  SensitivityBase,
  SensitivityDeltas,
  SensitivityResult,
  ElasticityResult,
} from '@/domain/calculations/algorithms/sensitivity'
import { getSensitivityWasmExports } from './wasmEngine'

function getWasm() {
  return getSensitivityWasmExports()!
}

export function calculateSensitivityWasm(
  base: SensitivityBase,
  deltas: SensitivityDeltas,
): SensitivityResult {
  const wasm = getWasm()
  const arr = wasm.calculate_sensitivity(
    base.totalSales,
    base.totalCost,
    base.totalDiscount,
    base.grossSales,
    base.totalCustomers,
    base.totalCostInclusion,
    base.averageMarkupRate,
    base.budget,
    base.elapsedDays,
    base.salesDays,
    deltas.discountRateDelta,
    deltas.customersDelta,
    deltas.transactionValueDelta,
    deltas.costRateDelta,
  )
  return {
    baseGrossProfit: arr[0],
    baseGrossProfitRate: arr[1],
    simulatedGrossProfit: arr[2],
    simulatedGrossProfitRate: arr[3],
    grossProfitDelta: arr[4],
    simulatedSales: arr[5],
    salesDelta: arr[6],
    simulatedProjectedSales: arr[7],
    projectedSalesDelta: arr[8],
    budgetAchievementDelta: arr[9],
  }
}

export function calculateElasticityWasm(base: SensitivityBase): ElasticityResult {
  const wasm = getWasm()
  const arr = wasm.calculate_elasticity(
    base.totalSales,
    base.totalCost,
    base.totalDiscount,
    base.grossSales,
    base.totalCustomers,
    base.totalCostInclusion,
    base.averageMarkupRate,
    base.budget,
    base.elapsedDays,
    base.salesDays,
  )
  return {
    discountRateElasticity: arr[0],
    customersElasticity: arr[1],
    transactionValueElasticity: arr[2],
    costRateElasticity: arr[3],
  }
}
