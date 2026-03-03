/**
 * METRIC_DEFS — 全指標のメタデータ定数
 *
 * MetricId レジストリ（references/metric-id-registry.md）のコード実装。
 * 各指標に label / unit / tokens / storeResultField を定義する。
 */
import type { MetricId, MetricMeta } from '../models/Explanation'

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
  },
  discountLossCost: {
    label: '売変ロス原価',
    unit: 'yen',
    tokens: { entity: 'discount', domain: 'actual', measure: 'value' },
    storeResultField: 'discountLossCost',
  },

  // ─── 値入率 ─────────────────────────────────────────────
  averageMarkupRate: {
    label: '平均値入率',
    unit: 'rate',
    tokens: { entity: 'markup', domain: 'actual', measure: 'average' },
    storeResultField: 'averageMarkupRate',
  },
  coreMarkupRate: {
    label: 'コア値入率',
    unit: 'rate',
    tokens: { entity: 'markup', domain: 'actual', measure: 'rate' },
    storeResultField: 'coreMarkupRate',
  },

  // ─── 粗利（在庫法 — 実績） ──────────────────────────────
  invMethodCogs: {
    label: '売上原価（在庫法）',
    unit: 'yen',
    tokens: { entity: 'cogs', domain: 'actual', measure: 'value' },
    storeResultField: 'invMethodCogs',
  },
  invMethodGrossProfit: {
    label: '実績粗利益（在庫法）',
    unit: 'yen',
    tokens: { entity: 'gp', domain: 'actual', measure: 'value' },
    storeResultField: 'invMethodGrossProfit',
  },
  invMethodGrossProfitRate: {
    label: '実績粗利率（在庫法）',
    unit: 'rate',
    tokens: { entity: 'gp', domain: 'actual', measure: 'rate' },
    storeResultField: 'invMethodGrossProfitRate',
  },

  // ─── 粗利（推定法 — 値入率ベース） ──────────────────────
  estMethodCogs: {
    label: '推定原価（値入率ベース）',
    unit: 'yen',
    tokens: { entity: 'cogs', domain: 'estimated', measure: 'value' },
    storeResultField: 'estMethodCogs',
  },
  estMethodMargin: {
    label: '推定粗利（値入率ベース）',
    unit: 'yen',
    tokens: { entity: 'gp', domain: 'estimated', measure: 'value' },
    storeResultField: 'estMethodMargin',
  },
  estMethodMarginRate: {
    label: '推定粗利率（値入率ベース）',
    unit: 'rate',
    tokens: { entity: 'gp', domain: 'estimated', measure: 'rate' },
    storeResultField: 'estMethodMarginRate',
  },
  estMethodClosingInventory: {
    label: '推定期末在庫',
    unit: 'yen',
    tokens: { entity: 'inventory', domain: 'estimated', measure: 'value' },
    storeResultField: 'estMethodClosingInventory',
  },

  // ─── 在庫差異 ───────────────────────────────────────────
  inventoryGap: {
    label: '在庫差異',
    unit: 'rate',
    tokens: { entity: 'gp', domain: 'actual', measure: 'gap' },
  },

  // ─── 客数 ───────────────────────────────────────────────
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
  },

  // ─── 原価算入費（消耗品） ───────────────────────────────
  totalConsumable: {
    label: '消耗品費',
    unit: 'yen',
    tokens: { entity: 'consumable', domain: 'actual', measure: 'value' },
    storeResultField: 'totalConsumable',
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
  },
  budgetProgressRate: {
    label: '売上予算消化率',
    unit: 'rate',
    tokens: { entity: 'sales', domain: 'budget', measure: 'progress' },
    storeResultField: 'budgetProgressRate',
  },
  budgetElapsedRate: {
    label: '経過予算率',
    unit: 'rate',
    tokens: { entity: 'sales', domain: 'budget', measure: 'rate' },
    storeResultField: 'budgetElapsedRate',
  },
  budgetProgressGap: {
    label: '売上進捗ギャップ',
    unit: 'rate',
    tokens: { entity: 'sales', domain: 'budget', measure: 'gap' },
    storeResultField: 'budgetProgressGap',
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
  },
  projectedAchievement: {
    label: '着地予測達成率',
    unit: 'rate',
    tokens: { entity: 'sales', domain: 'forecast', measure: 'achievement' },
    storeResultField: 'projectedAchievement',
  },
  requiredDailySales: {
    label: '必要日次売上',
    unit: 'yen',
    tokens: { entity: 'sales', domain: 'budget', measure: 'required' },
    storeResultField: 'requiredDailySales',
  },
  averageDailySales: {
    label: '日平均売上',
    unit: 'yen',
    tokens: { entity: 'sales', domain: 'actual', measure: 'average' },
    storeResultField: 'averageDailySales',
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
  },
  grossProfitBudgetVariance: {
    label: '粗利予算差異',
    unit: 'yen',
    tokens: { entity: 'gp', domain: 'budget', measure: 'variance' },
  },
  grossProfitProgressGap: {
    label: '粗利進捗ギャップ',
    unit: 'rate',
    tokens: { entity: 'gp', domain: 'budget', measure: 'gap' },
  },
  projectedGrossProfit: {
    label: '粗利着地予測',
    unit: 'yen',
    tokens: { entity: 'gp', domain: 'forecast', measure: 'value' },
  },
  projectedGPAchievement: {
    label: '粗利着地予測達成率',
    unit: 'rate',
    tokens: { entity: 'gp', domain: 'forecast', measure: 'achievement' },
  },
  requiredDailyGrossProfit: {
    label: '必要日次粗利',
    unit: 'yen',
    tokens: { entity: 'gp', domain: 'budget', measure: 'required' },
  },
} as const
