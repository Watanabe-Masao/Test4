/**
 * Expected Coverage 定義 — engine × path ごとの expected functions
 *
 * どの UI 操作がどの compare 関数を踏むかを固定する。
 */

export const EXPECTED_FUNCTIONS = {
  grossProfit: {
    inventory: ['calculateInvMethod'],
    estimated: ['calculateEstMethod', 'calculateDiscountRate'],
    markupTransfer: ['calculateMarkupRates', 'calculateTransferTotals'],
    coreSales: ['calculateCoreSales'],
    discountImpact: ['calculateDiscountImpact'],
    inventoryCost: ['calculateInventoryCost'],
    all: [
      'calculateInvMethod',
      'calculateEstMethod',
      'calculateCoreSales',
      'calculateDiscountRate',
      'calculateDiscountImpact',
      'calculateMarkupRates',
      'calculateTransferTotals',
      'calculateInventoryCost',
    ],
  },
  budgetAnalysis: {
    singleStore: ['calculateBudgetAnalysis'],
    grossProfitBudget: ['calculateGrossProfitBudget'],
    all: ['calculateBudgetAnalysis', 'calculateGrossProfitBudget'],
  },
  forecast: {
    stddev: ['calculateStdDev'],
    anomalies: ['detectAnomalies'],
    regressionTrend: ['linearRegression', 'analyzeTrend', 'calculateWMA'],
    all: ['calculateStdDev', 'detectAnomalies', 'calculateWMA', 'linearRegression', 'analyzeTrend'],
  },
  factorDecomposition: {
    standard: ['decompose2', 'decompose3'],
    priceMix: ['decompose5', 'decomposePriceMix'],
    all: ['decompose2', 'decompose3', 'decompose5', 'decomposePriceMix'],
  },
} as const
