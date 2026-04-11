// WASM モジュールの ambient type declarations
//
// wasm-pack build で生成される pkg/ ディレクトリが存在しない環境（CI 等）でも
// tsc -b が通るように、各 WASM モジュールの型を宣言する。
//
// 型定義はモック（src/test/__mocks__/*WasmMock.ts）および
// Rust ソース（wasm/*/src/lib.rs）のエクスポートと一致させること。

// ─── factor-decomposition-wasm ─────────────────────────
declare module 'factor-decomposition-wasm' {
  export default function init(): Promise<void>
  export function decompose2(
    prevSales: number,
    curSales: number,
    prevCust: number,
    curCust: number,
  ): Float64Array
  export function decompose3(
    prevSales: number,
    curSales: number,
    prevCust: number,
    curCust: number,
    prevTotalQty: number,
    curTotalQty: number,
  ): Float64Array
  export function decompose_price_mix(
    curKeys: string[],
    curQtys: Float64Array,
    curAmts: Float64Array,
    prevKeys: string[],
    prevQtys: Float64Array,
    prevAmts: Float64Array,
  ): Float64Array
  export function decompose5(
    prevSales: number,
    curSales: number,
    prevCust: number,
    curCust: number,
    prevTotalQty: number,
    curTotalQty: number,
    curKeys: string[],
    curQtys: Float64Array,
    curAmts: Float64Array,
    prevKeys: string[],
    prevQtys: Float64Array,
    prevAmts: Float64Array,
  ): Float64Array
}

// ─── gross-profit-wasm ─────────────────────────────────
declare module 'gross-profit-wasm' {
  export default function init(): Promise<void>
  export function calculate_inv_method(
    openingInventory: number,
    closingInventory: number,
    totalPurchaseCost: number,
    totalSales: number,
  ): Float64Array
  export function calculate_est_method(
    coreSales: number,
    discountRate: number,
    markupRate: number,
    costInclusionCost: number,
    openingInventory: number,
    inventoryPurchaseCost: number,
  ): Float64Array
  export function calculate_core_sales(
    totalSales: number,
    flowerSalesPrice: number,
    directProduceSalesPrice: number,
  ): Float64Array
  export function calculate_discount_rate(salesAmount: number, discountAmount: number): number
  export function calculate_discount_impact(
    coreSales: number,
    markupRate: number,
    discountRate: number,
  ): number
  export function calculate_markup_rates(
    purchasePrice: number,
    purchaseCost: number,
    deliveryPrice: number,
    deliveryCost: number,
    transferPrice: number,
    transferCost: number,
    defaultMarkupRate: number,
  ): Float64Array
  export function calculate_transfer_totals(
    interStoreInPrice: number,
    interStoreInCost: number,
    interStoreOutPrice: number,
    interStoreOutCost: number,
    interDepartmentInPrice: number,
    interDepartmentInCost: number,
    interDepartmentOutPrice: number,
    interDepartmentOutCost: number,
  ): Float64Array
  export function calculate_inventory_cost(totalCost: number, deliverySalesCost: number): number
}

// ─── budget-analysis-wasm ──────────────────────────────
declare module 'budget-analysis-wasm' {
  export default function init(): Promise<void>
  export function calculate_budget_analysis(
    totalSales: number,
    budget: number,
    budgetDailyArr: Float64Array,
    elapsedDays: number,
    salesDays: number,
    daysInMonth: number,
  ): Float64Array
  export function calculate_gross_profit_budget(
    grossProfit: number,
    grossProfitBudget: number,
    budgetElapsedRate: number,
    elapsedDays: number,
    salesDays: number,
    daysInMonth: number,
  ): Float64Array
}

// ─── forecast-wasm ─────────────────────────────────────
declare module 'forecast-wasm' {
  export default function init(): Promise<void>
  export function calculate_stddev(values: Float64Array): Float64Array
  export function detect_anomalies(
    keys: Float64Array,
    values: Float64Array,
    threshold: number,
  ): Float64Array
  export function calculate_wma(
    keys: Float64Array,
    values: Float64Array,
    window: number,
  ): Float64Array
  export function linear_regression(keys: Float64Array, values: Float64Array): Float64Array
  export function analyze_trend(
    years: Float64Array,
    months: Float64Array,
    totalSales: Float64Array,
  ): Float64Array
}

// ─── time-slot-wasm ─────────────────────────────────────
declare module 'time-slot-wasm' {
  export default function init(): Promise<void>
  export function find_core_time(hours: Float64Array, amounts: Float64Array): Float64Array
  export function find_turnaround_hour(hours: Float64Array, amounts: Float64Array): number
}

// ─── pi-value-wasm (candidate: BIZ-012) ─────────────────
declare module 'pi-value-wasm' {
  export default function init(): Promise<void>
  export function calculate_quantity_pi(totalQuantity: number, customers: number): number
  export function calculate_amount_pi(totalSales: number, customers: number): number
  export function calculate_pi_values(
    totalQuantity: number,
    totalSales: number,
    customers: number,
  ): Float64Array
}

// ─── customer-gap-wasm (candidate: BIZ-013) ─────────────
// ─── remaining-budget-rate-wasm (candidate: BIZ-008) ─────
declare module 'remaining-budget-rate-wasm' {
  export default function init(): Promise<void>
  export function calculate_remaining_budget_rate(
    budget: number,
    totalSales: number,
    budgetDailyArr: Float64Array,
    elapsedDays: number,
    daysInMonth: number,
  ): number
}

// ─── observation-period-wasm (candidate: BIZ-010) ────────
declare module 'observation-period-wasm' {
  export default function init(): Promise<void>
  export function evaluate_observation_period(
    dailySales: Float64Array,
    daysInMonth: number,
    currentElapsedDays: number,
    minDaysForValid: number,
    minDaysForOk: number,
    staleDaysThreshold: number,
    minSalesDays: number,
  ): Float64Array
}

// ─── sensitivity-wasm (candidate: ANA-003) ──────────────
declare module 'sensitivity-wasm' {
  export default function init(): Promise<void>
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
  ): Float64Array
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
  ): Float64Array
}

// ─── inventory-calc-wasm (candidate: BIZ-009) ───────────
declare module 'inventory-calc-wasm' {
  export default function init(): Promise<void>
  export function compute_estimated_inventory_details(
    dailySales: Float64Array,
    dailyFlowersPrice: Float64Array,
    dailyDirectProducePrice: Float64Array,
    dailyCostInclusionCost: Float64Array,
    dailyTotalCost: Float64Array,
    dailyDeliverySalesCost: Float64Array,
    openingInventory: number,
    closingInventory: number,
    markupRate: number,
    discountRate: number,
    daysInMonth: number,
  ): Float64Array
}

// ─── pin-intervals-wasm (candidate: BIZ-011) ────────────
declare module 'pin-intervals-wasm' {
  export default function init(): Promise<void>
  export function calculate_pin_intervals(
    dailySales: Float64Array,
    dailyTotalCost: Float64Array,
    openingInventory: number,
    pinDays: Int32Array,
    pinClosingInventory: Float64Array,
    daysInMonth: number,
  ): Float64Array
}

declare module 'customer-gap-wasm' {
  export default function init(): Promise<void>
  export function calculate_customer_gap(
    curCustomers: number,
    prevCustomers: number,
    curQuantity: number,
    prevQuantity: number,
    curSales: number,
    prevSales: number,
  ): Float64Array
}
