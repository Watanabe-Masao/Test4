/**
 * DEV-only Observation Entry Point
 *
 * E2E 観測 spec が window.__runObservation() 経由で bridge 関数を直接呼べるようにする。
 * PROD ビルドでは import されない（main.tsx の DEV ガード内で登録）。
 *
 * フロー:
 *   E2E spec → page.evaluate('__runObservation("grossProfit", {...})') →
 *   bridge 関数実行 → dualRunObserver に統計蓄積 →
 *   E2E spec → page.evaluate('__dualRunStats()') で回収
 */
import {
  calculateInvMethod,
  calculateEstMethodWithStatus,
  calculateCoreSales,
  calculateDiscountRate,
  calculateDiscountImpact,
  calculateMarkupRates,
  calculateTransferTotals,
  calculateInventoryCost,
} from './grossProfitBridge'
import { calculateBudgetAnalysis, calculateGrossProfitBudget } from './budgetAnalysisBridge'
import {
  calculateStdDev,
  detectAnomalies,
  calculateWMA,
  linearRegression,
  analyzeTrend,
} from './forecastBridge'
import { decompose2, decompose3, decompose5, decomposePriceMix } from './factorDecompositionBridge'

/* ── 型定義 ── */

/** E2E から渡されるシリアライズ可能なフィクスチャ */
interface GrossProfitFixtureData {
  readonly invMethod: {
    openingInventory: number | null
    closingInventory: number | null
    totalPurchaseCost: number
    totalSales: number
  }
  readonly estMethod: {
    coreSales: number
    discountRate: number
    markupRate: number
    costInclusionCost: number
    openingInventory: number | null
    inventoryPurchaseCost: number
  }
  readonly coreSales: {
    totalSales: number
    flowerSalesPrice: number
    directProduceSalesPrice: number
  }
  readonly discountRate: { discountAmount: number; salesAmount: number }
  readonly discountImpact: { coreSales: number; markupRate: number; discountRate: number }
  readonly markupRates: {
    purchasePrice: number
    purchaseCost: number
    deliveryPrice: number
    deliveryCost: number
    transferPrice: number
    transferCost: number
    defaultMarkupRate: number
  }
  readonly transferTotals: {
    interStoreInPrice: number
    interStoreInCost: number
    interStoreOutPrice: number
    interStoreOutCost: number
    interDepartmentInPrice: number
    interDepartmentInCost: number
    interDepartmentOutPrice: number
    interDepartmentOutCost: number
  }
  readonly inventoryCost: { totalCost: number; deliverySalesCost: number }
}

interface BudgetAnalysisFixtureData {
  readonly budgetAnalysis: {
    totalSales: number
    budget: number
    budgetDaily: Record<string, number>
    salesDaily: Record<string, number>
    elapsedDays: number
    salesDays: number
    daysInMonth: number
  }
  readonly grossProfitBudget: {
    grossProfit: number
    grossProfitBudget: number
    budgetElapsedRate: number
    elapsedDays: number
    salesDays: number
    daysInMonth: number
  }
}

interface ForecastFixtureData {
  /** dailySales as [key, value][] for JSON serialization */
  readonly dailySalesEntries: readonly [number, number][]
  readonly monthlyData: readonly {
    year: number
    month: number
    totalSales: number
    totalCustomers: number | null
    grossProfit: number | null
    grossProfitRate: number | null
    budget: number | null
    budgetAchievement: number | null
    storeCount: number
    discountRate: number | null
    costRate: number | null
    costInclusionRate: number | null
    averageMarkupRate: number | null
  }[]
}

interface FactorDecompositionFixtureData {
  readonly prevSales: number
  readonly curSales: number
  readonly prevCust: number
  readonly curCust: number
  readonly prevQty: number
  readonly curQty: number
  readonly prevCategories?: readonly { key: string; qty: number; amt: number }[]
  readonly curCategories?: readonly { key: string; qty: number; amt: number }[]
}

type EngineFixtureData =
  | { engine: 'grossProfit'; data: GrossProfitFixtureData }
  | { engine: 'budgetAnalysis'; data: BudgetAnalysisFixtureData }
  | { engine: 'forecast'; data: ForecastFixtureData }
  | { engine: 'factorDecomposition'; data: FactorDecompositionFixtureData }

/* ── 実行エントリポイント ── */

function runGrossProfit(d: GrossProfitFixtureData): void {
  calculateInvMethod(d.invMethod)
  calculateEstMethodWithStatus(d.estMethod)
  calculateCoreSales(
    d.coreSales.totalSales,
    d.coreSales.flowerSalesPrice,
    d.coreSales.directProduceSalesPrice,
  )
  calculateDiscountRate(d.discountRate.discountAmount, d.discountRate.salesAmount)
  calculateDiscountImpact(d.discountImpact)
  calculateMarkupRates(d.markupRates)
  calculateTransferTotals(d.transferTotals)
  calculateInventoryCost(d.inventoryCost.totalCost, d.inventoryCost.deliverySalesCost)
}

function runBudgetAnalysis(d: BudgetAnalysisFixtureData): void {
  calculateBudgetAnalysis(d.budgetAnalysis)
  calculateGrossProfitBudget(d.grossProfitBudget)
}

function runForecast(d: ForecastFixtureData): void {
  const dailySales = new Map(d.dailySalesEntries)
  const values = [...dailySales.values()]

  calculateStdDev(values)
  detectAnomalies(dailySales)

  if (dailySales.size >= 2) {
    calculateWMA(dailySales)
    linearRegression(dailySales)
  }

  if (d.monthlyData.length >= 3) {
    analyzeTrend(d.monthlyData)
  }
}

function runFactorDecomposition(d: FactorDecompositionFixtureData): void {
  decompose2(d.prevSales, d.curSales, d.prevCust, d.curCust)
  decompose3(d.prevSales, d.curSales, d.prevCust, d.curCust, d.prevQty, d.curQty)

  if (d.prevCategories && d.curCategories) {
    decompose5(
      d.prevSales,
      d.curSales,
      d.prevCust,
      d.curCust,
      d.prevQty,
      d.curQty,
      d.curCategories,
      d.prevCategories,
    )
    decomposePriceMix(d.curCategories, d.prevCategories)
  }
}

/**
 * E2E から呼ばれるエントリポイント。
 * window.__runObservation として登録される。
 *
 * 使い方:
 *   __runObservation({ engine: 'grossProfit', data: {...} })
 */
export function runObservationHandler(input: EngineFixtureData): string {
  switch (input.engine) {
    case 'grossProfit':
      runGrossProfit(input.data)
      return `grossProfit: 8 functions executed`
    case 'budgetAnalysis':
      runBudgetAnalysis(input.data)
      return `budgetAnalysis: 2 functions executed`
    case 'forecast':
      runForecast(input.data)
      return `forecast: 5 functions executed`
    case 'factorDecomposition':
      runFactorDecomposition(input.data)
      return `factorDecomposition: 4 functions executed`
    default:
      throw new Error(`unknown engine: ${(input as EngineFixtureData).engine}`)
  }
}
