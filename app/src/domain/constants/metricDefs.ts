/**
 * METRIC_DEFS — 全指標のメタデータ定数
 *
 * MetricId レジストリ（references/metric-id-registry.md）のコード実装。
 * 各指標に label / unit / tokens / storeResultField を定義する。
 */
import type { MetricId, MetricMeta } from '../models/Explanation'
// formulaRef は FORMULA_REGISTRY の FormulaId を参照する（型は MetricMeta 経由で解決）

export const METRIC_DEFS: Readonly<Record<MetricId, MetricMeta>> = {
  // ─── 売上系 ─────────────────────────────────────────────
  salesTotal: {
    label: '総売上',
    unit: 'yen',
    tokens: { entity: 'sales', domain: 'actual', measure: 'value' },
    storeResultField: 'totalSales',
  },
  coreSales: {
    label: 'コア売上',
    unit: 'yen',
    tokens: { entity: 'sales', domain: 'actual', measure: 'value' },
    storeResultField: 'totalCoreSales',
  },
  grossSales: {
    label: '粗売上',
    unit: 'yen',
    tokens: { entity: 'sales', domain: 'actual', measure: 'value' },
    storeResultField: 'grossSales',
    formulaRef: 'estimationMethodCogs',
  },

  // ─── 仕入系 ─────────────────────────────────────────────
  purchaseCost: {
    label: '総仕入原価',
    unit: 'yen',
    tokens: { entity: 'purchase', domain: 'actual', measure: 'value' },
    storeResultField: 'totalCost',
  },
  inventoryCost: {
    label: '在庫仕入原価',
    unit: 'yen',
    tokens: { entity: 'purchase', domain: 'actual', measure: 'value' },
    storeResultField: 'inventoryCost',
  },
  deliverySalesCost: {
    label: '売上納品原価',
    unit: 'yen',
    tokens: { entity: 'purchase', domain: 'actual', measure: 'value' },
    storeResultField: 'deliverySalesCost',
  },

  // ─── 売変系 ─────────────────────────────────────────────
  discountTotal: {
    label: '売変額合計',
    unit: 'yen',
    tokens: { entity: 'discount', domain: 'actual', measure: 'value' },
    storeResultField: 'totalDiscount',
  },
  discountRate: {
    label: '売変率',
    unit: 'rate',
    tokens: { entity: 'discount', domain: 'actual', measure: 'rate' },
    storeResultField: 'discountRate',
    formulaRef: 'ratioCalculation',
    authoritativeOwner: 'ts',
    sourceEngine: 'ts',
    fallbackRule: 'zero',
  },
  discountLossCost: {
    label: '売変ロス原価',
    unit: 'yen',
    tokens: { entity: 'discount', domain: 'actual', measure: 'value' },
    storeResultField: 'discountLossCost',
    formulaRef: 'discountLossCost',
    authoritativeOwner: 'ts',
    sourceEngine: 'ts',
    fallbackRule: 'null',
    warningRule: 'calc_discount_rate_out_of_domain',
    acceptancePolicy: {
      blockingWarningCategories: ['calc'],
    },
  },

  // ─── 値入率 ─────────────────────────────────────────────
  averageMarkupRate: {
    label: '平均値入率',
    unit: 'rate',
    tokens: { entity: 'markup', domain: 'actual', measure: 'average' },
    storeResultField: 'averageMarkupRate',
    formulaRef: 'salesWeightedAverage',
  },
  coreMarkupRate: {
    label: 'コア値入率',
    unit: 'rate',
    tokens: { entity: 'markup', domain: 'actual', measure: 'rate' },
    storeResultField: 'coreMarkupRate',
    formulaRef: 'salesWeightedAverage',
  },

  // ─── 粗利（在庫法 — 実績） ──────────────────────────────
  invMethodCogs: {
    label: '売上原価（在庫法）',
    unit: 'yen',
    tokens: { entity: 'cogs', domain: 'actual', measure: 'value' },
    storeResultField: 'invMethodCogs',
    formulaRef: 'inventoryMethodCogs',
    authoritativeOwner: 'ts',
    sourceEngine: 'ts',
    fallbackRule: 'null',
  },
  invMethodGrossProfit: {
    label: '実績粗利益（在庫法）',
    unit: 'yen',
    tokens: { entity: 'gp', domain: 'actual', measure: 'value' },
    storeResultField: 'invMethodGrossProfit',
    formulaRef: 'inventoryMethodCogs',
    authoritativeOwner: 'ts',
    sourceEngine: 'ts',
    fallbackRule: 'null',
  },
  invMethodGrossProfitRate: {
    label: '実績粗利率（在庫法）',
    unit: 'rate',
    tokens: { entity: 'gp', domain: 'actual', measure: 'rate' },
    storeResultField: 'invMethodGrossProfitRate',
    formulaRef: 'ratioCalculation',
    authoritativeOwner: 'ts',
    sourceEngine: 'ts',
    fallbackRule: 'null',
    acceptancePolicy: {
      // partial は authoritative 不可（在庫法粗利率は正確な値が必須）
    },
  },

  // ─── 粗利（推定法 — 値入率ベース） ──────────────────────
  estMethodCogs: {
    label: '推定原価（値入率ベース）',
    unit: 'yen',
    tokens: { entity: 'cogs', domain: 'estimated', measure: 'value' },
    storeResultField: 'estMethodCogs',
    formulaRef: 'estimationMethodCogs',
    authoritativeOwner: 'ts',
    sourceEngine: 'ts',
    fallbackRule: 'null',
    warningRule: 'calc_discount_rate_out_of_domain',
    acceptancePolicy: {
      blockingWarningCategories: ['calc'],
    },
  },
  estMethodMargin: {
    label: '推定粗利（値入率ベース）',
    unit: 'yen',
    tokens: { entity: 'gp', domain: 'estimated', measure: 'value' },
    storeResultField: 'estMethodMargin',
    formulaRef: 'estimationMethodCogs',
    authoritativeOwner: 'ts',
    sourceEngine: 'ts',
    fallbackRule: 'null',
    warningRule: 'calc_discount_rate_out_of_domain',
    acceptancePolicy: {
      blockingWarningCategories: ['calc'],
    },
  },
  estMethodMarginRate: {
    label: '推定粗利率（値入率ベース）',
    unit: 'rate',
    tokens: { entity: 'gp', domain: 'estimated', measure: 'rate' },
    storeResultField: 'estMethodMarginRate',
    formulaRef: 'ratioCalculation',
    authoritativeOwner: 'ts',
    sourceEngine: 'ts',
    fallbackRule: 'null',
    warningRule: 'calc_discount_rate_out_of_domain',
    acceptancePolicy: {
      blockingWarningCategories: ['calc'],
    },
  },
  estMethodClosingInventory: {
    label: '推定期末在庫',
    unit: 'yen',
    tokens: { entity: 'inventory', domain: 'estimated', measure: 'value' },
    storeResultField: 'estMethodClosingInventory',
    formulaRef: 'estimationMethodCogs',
  },

  // ─── 在庫差異 ───────────────────────────────────────────
  inventoryGap: {
    label: '在庫差異',
    unit: 'rate',
    tokens: { entity: 'gp', domain: 'actual', measure: 'gap' },
  },

  // ─── 客数・客生産性 ────────────────────────────────────────
  totalCustomers: {
    label: '来店客数',
    unit: 'count',
    tokens: { entity: 'customer', domain: 'actual', measure: 'value' },
    storeResultField: 'totalCustomers',
  },
  averageSpendPerCustomer: {
    label: '客単価',
    unit: 'yen',
    tokens: { entity: 'customer', domain: 'actual', measure: 'average' },
    formulaRef: 'ratioCalculation',
  },
  itemsPerCustomer: {
    label: '一人当たり点数',
    unit: 'count',
    tokens: { entity: 'customer', domain: 'actual', measure: 'average' },
    formulaRef: 'ratioCalculation',
  },
  averagePricePerItem: {
    label: '点単価',
    unit: 'yen',
    tokens: { entity: 'sales', domain: 'actual', measure: 'average' },
    formulaRef: 'ratioCalculation',
  },

  // ─── 原価算入費（消耗品） ───────────────────────────────
  totalCostInclusion: {
    label: '原価算入費',
    unit: 'yen',
    tokens: { entity: 'costInclusion', domain: 'actual', measure: 'value' },
    storeResultField: 'totalCostInclusion',
  },

  // ─── 売上予算系 ─────────────────────────────────────────
  budget: {
    label: '売上予算',
    unit: 'yen',
    tokens: { entity: 'sales', domain: 'budget', measure: 'value' },
    storeResultField: 'budget',
  },
  budgetAchievementRate: {
    label: '売上予算達成率',
    unit: 'rate',
    tokens: { entity: 'sales', domain: 'budget', measure: 'achievement' },
    storeResultField: 'budgetAchievementRate',
    formulaRef: 'ratioCalculation',
    authoritativeOwner: 'ts',
    sourceEngine: 'ts',
    fallbackRule: 'zero',
    acceptancePolicy: {
      allowAuthoritativeWhenPartial: true,
    },
  },
  budgetProgressRate: {
    label: '売上予算消化率',
    unit: 'rate',
    tokens: { entity: 'sales', domain: 'budget', measure: 'progress' },
    storeResultField: 'budgetProgressRate',
    formulaRef: 'ratioCalculation',
    authoritativeOwner: 'ts',
    sourceEngine: 'ts',
    fallbackRule: 'zero',
  },
  budgetElapsedRate: {
    label: '経過予算率',
    unit: 'rate',
    tokens: { entity: 'sales', domain: 'budget', measure: 'rate' },
    storeResultField: 'budgetElapsedRate',
    formulaRef: 'ratioCalculation',
    authoritativeOwner: 'ts',
    sourceEngine: 'ts',
    fallbackRule: 'zero',
  },
  budgetProgressGap: {
    label: '売上進捗ギャップ',
    unit: 'rate',
    tokens: { entity: 'sales', domain: 'budget', measure: 'gap' },
    storeResultField: 'budgetProgressGap',
    authoritativeOwner: 'ts',
    sourceEngine: 'ts',
    fallbackRule: 'zero',
  },
  budgetVariance: {
    label: '売上予算差異',
    unit: 'yen',
    tokens: { entity: 'sales', domain: 'budget', measure: 'variance' },
    storeResultField: 'budgetVariance',
  },
  projectedSales: {
    label: '月末予測売上',
    unit: 'yen',
    tokens: { entity: 'sales', domain: 'forecast', measure: 'value' },
    storeResultField: 'projectedSales',
    formulaRef: 'monthEndProjection',
    authoritativeOwner: 'ts',
    sourceEngine: 'ts',
    fallbackRule: 'zero',
    acceptancePolicy: {
      allowAuthoritativeWhenPartial: true,
      allowExploratoryWhenInvalid: true,
    },
  },
  projectedAchievement: {
    label: '着地予測達成率',
    unit: 'rate',
    tokens: { entity: 'sales', domain: 'forecast', measure: 'achievement' },
    storeResultField: 'projectedAchievement',
    formulaRef: 'ratioCalculation',
    authoritativeOwner: 'ts',
    sourceEngine: 'ts',
    fallbackRule: 'zero',
    acceptancePolicy: {
      allowAuthoritativeWhenPartial: true,
      allowExploratoryWhenInvalid: true,
    },
  },
  requiredDailySales: {
    label: '必要日次売上',
    unit: 'yen',
    tokens: { entity: 'sales', domain: 'budget', measure: 'required' },
    storeResultField: 'requiredDailySales',
    formulaRef: 'ratioCalculation',
    authoritativeOwner: 'ts',
    sourceEngine: 'ts',
    fallbackRule: 'zero',
    acceptancePolicy: {
      allowAuthoritativeWhenPartial: true,
    },
  },
  averageDailySales: {
    label: '日平均売上',
    unit: 'yen',
    tokens: { entity: 'sales', domain: 'actual', measure: 'average' },
    storeResultField: 'averageDailySales',
    formulaRef: 'ratioCalculation',
  },
  remainingBudget: {
    label: '残余予算',
    unit: 'yen',
    tokens: { entity: 'sales', domain: 'budget', measure: 'value' },
    storeResultField: 'remainingBudget',
  },

  // ─── 仕入予算系 ─────────────────────────────────────────
  purchaseBudget: {
    label: '仕入予算',
    unit: 'yen',
    tokens: { entity: 'purchase', domain: 'budget', measure: 'value' },
  },
  purchaseBudgetAchievement: {
    label: '仕入予算達成率',
    unit: 'rate',
    tokens: { entity: 'purchase', domain: 'budget', measure: 'achievement' },
    formulaRef: 'ratioCalculation',
  },
  purchaseBudgetVariance: {
    label: '仕入予算差異',
    unit: 'yen',
    tokens: { entity: 'purchase', domain: 'budget', measure: 'variance' },
  },
  requiredDailyPurchase: {
    label: '必要日次仕入',
    unit: 'yen',
    tokens: { entity: 'purchase', domain: 'budget', measure: 'required' },
    formulaRef: 'ratioCalculation',
  },

  // ─── 粗利予算系 ─────────────────────────────────────────
  grossProfitBudget: {
    label: '粗利予算',
    unit: 'yen',
    tokens: { entity: 'gp', domain: 'budget', measure: 'value' },
    storeResultField: 'grossProfitBudget',
  },
  grossProfitRateBudget: {
    label: '粗利率予算',
    unit: 'rate',
    tokens: { entity: 'gp', domain: 'budget', measure: 'rate' },
    storeResultField: 'grossProfitRateBudget',
  },
  grossProfitBudgetAchievement: {
    label: '粗利予算達成率',
    unit: 'rate',
    tokens: { entity: 'gp', domain: 'budget', measure: 'achievement' },
    formulaRef: 'ratioCalculation',
    authoritativeOwner: 'ts',
    sourceEngine: 'ts',
    fallbackRule: 'zero',
    acceptancePolicy: {
      allowAuthoritativeWhenPartial: true,
    },
  },
  grossProfitBudgetVariance: {
    label: '粗利予算差異',
    unit: 'yen',
    tokens: { entity: 'gp', domain: 'budget', measure: 'variance' },
    authoritativeOwner: 'ts',
    sourceEngine: 'ts',
    fallbackRule: 'zero',
  },
  grossProfitProgressGap: {
    label: '粗利進捗ギャップ',
    unit: 'rate',
    tokens: { entity: 'gp', domain: 'budget', measure: 'gap' },
    authoritativeOwner: 'ts',
    sourceEngine: 'ts',
    fallbackRule: 'zero',
  },
  projectedGrossProfit: {
    label: '粗利着地予測',
    unit: 'yen',
    tokens: { entity: 'gp', domain: 'forecast', measure: 'value' },
    formulaRef: 'monthEndProjection',
    authoritativeOwner: 'ts',
    sourceEngine: 'ts',
    fallbackRule: 'zero',
    acceptancePolicy: {
      allowAuthoritativeWhenPartial: true,
      allowExploratoryWhenInvalid: true,
    },
  },
  projectedGPAchievement: {
    label: '粗利着地予測達成率',
    unit: 'rate',
    tokens: { entity: 'gp', domain: 'forecast', measure: 'achievement' },
    formulaRef: 'ratioCalculation',
    authoritativeOwner: 'ts',
    sourceEngine: 'ts',
    fallbackRule: 'zero',
    acceptancePolicy: {
      allowAuthoritativeWhenPartial: true,
      allowExploratoryWhenInvalid: true,
    },
  },
  requiredDailyGrossProfit: {
    label: '必要日次粗利',
    unit: 'yen',
    tokens: { entity: 'gp', domain: 'budget', measure: 'required' },
    formulaRef: 'ratioCalculation',
  },

  // ─── 前年予算比較系 ─────────────────────────────────────
  prevYearSameDowBudgetRatio: {
    label: '前年同曜日予算比',
    unit: 'rate',
    tokens: { entity: 'sales', domain: 'budget', measure: 'achievement' },
    formulaRef: 'ratioCalculation',
  },
  prevYearSameDateBudgetRatio: {
    label: '前年同日予算比',
    unit: 'rate',
    tokens: { entity: 'sales', domain: 'budget', measure: 'achievement' },
    formulaRef: 'ratioCalculation',
  },
  // ─── 曜日ギャップ ──────────────────────────────────────
  dowGapImpact: {
    label: '曜日ギャップ影響額',
    unit: 'yen',
    tokens: { entity: 'sales', domain: 'estimated', measure: 'variance' },
  },
} as const
