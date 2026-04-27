/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import { METRIC_DEFS } from '../metricDefs'
import type { MetricId } from '@/domain/models/Explanation'

/** All MetricId values defined in the Explanation type */
const ALL_METRIC_IDS: MetricId[] = [
  'salesTotal',
  'coreSales',
  'grossSales',
  'purchaseCost',
  'inventoryCost',
  'deliverySalesCost',
  'discountTotal',
  'discountRate',
  'discountLossCost',
  'averageMarkupRate',
  'coreMarkupRate',
  'invMethodCogs',
  'invMethodGrossProfit',
  'invMethodGrossProfitRate',
  'estMethodCogs',
  'estMethodMargin',
  'estMethodMarginRate',
  'estMethodClosingInventory',
  'inventoryGap',
  'totalCustomers',
  'averageSpendPerCustomer',
  'itemsPerCustomer',
  'averagePricePerItem',
  'totalCostInclusion',
  'budget',
  'budgetAchievementRate',
  'budgetProgressRate',
  'budgetElapsedRate',
  'budgetProgressGap',
  'budgetVariance',
  'projectedSales',
  'projectedAchievement',
  'requiredDailySales',
  'averageDailySales',
  'remainingBudget',
  'purchaseBudget',
  'purchaseBudgetAchievement',
  'purchaseBudgetVariance',
  'requiredDailyPurchase',
  'grossProfitBudget',
  'grossProfitRateBudget',
  'grossProfitBudgetAchievement',
  'grossProfitBudgetVariance',
  'grossProfitProgressGap',
  'projectedGrossProfit',
  'projectedGPAchievement',
  'requiredDailyGrossProfit',
  'prevYearSameDowBudgetRatio',
  'prevYearSameDateBudgetRatio',
  'dowGapImpact',
  // 自由期間分析系
  'freePeriodTotalSales',
  'freePeriodBudgetAchievement',
  'freePeriodDiscountRate',
  'freePeriodTransactionValue',
  'freePeriodDeptSalesAchievement',
]

describe('METRIC_DEFS', () => {
  it('defines every MetricId', () => {
    for (const id of ALL_METRIC_IDS) {
      expect(METRIC_DEFS[id]).toBeDefined()
    }
  })

  it('has no extra keys beyond MetricId', () => {
    const keys = Object.keys(METRIC_DEFS) as MetricId[]
    expect(keys.length).toBe(ALL_METRIC_IDS.length)
  })

  it('every entry has required fields', () => {
    for (const [id, meta] of Object.entries(METRIC_DEFS)) {
      expect(meta.label).toBeTruthy()
      expect(['yen', 'rate', 'count']).toContain(meta.unit)
      expect(meta.tokens).toBeDefined()
      expect(meta.tokens.entity).toBeTruthy()
      expect(meta.tokens.domain).toBeTruthy()
      expect(meta.tokens.measure).toBeTruthy()
      // storeResultField is optional — just verify it's string if present
      if (meta.storeResultField !== undefined) {
        expect(typeof meta.storeResultField).toBe('string')
      }
      // formulaRef is optional — just verify it's string if present
      if (meta.formulaRef !== undefined) {
        expect(typeof meta.formulaRef).toBe('string')
      }
      void id // used in loop
    }
  })

  it('labels are unique', () => {
    const labels = Object.values(METRIC_DEFS).map((m) => m.label)
    const uniqueLabels = new Set(labels)
    expect(uniqueLabels.size).toBe(labels.length)
  })

  it('tokens.domain is one of the valid values', () => {
    const validDomains = new Set(['actual', 'budget', 'estimated', 'forecast'])
    for (const meta of Object.values(METRIC_DEFS)) {
      expect(validDomains.has(meta.tokens.domain)).toBe(true)
    }
  })

  it('tokens.entity is one of the valid values', () => {
    const validEntities = new Set([
      'sales',
      'purchase',
      'cogs',
      'discount',
      'markup',
      'gp',
      'inventory',
      'customer',
      'costInclusion',
    ])
    for (const meta of Object.values(METRIC_DEFS)) {
      expect(validEntities.has(meta.tokens.entity)).toBe(true)
    }
  })

  it('specific metrics have correct properties', () => {
    expect(METRIC_DEFS.salesTotal.label).toBe('総売上')
    expect(METRIC_DEFS.salesTotal.unit).toBe('yen')
    expect(METRIC_DEFS.salesTotal.storeResultField).toBe('totalSales')

    expect(METRIC_DEFS.discountRate.unit).toBe('rate')
    expect(METRIC_DEFS.totalCustomers.unit).toBe('count')
  })
})
