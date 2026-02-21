import { describe, it, expect } from 'vitest'
import { evaluateAlerts, evaluateAllStoreAlerts, DEFAULT_ALERT_RULES } from './alertSystem'
import type { AlertRule } from './alertSystem'
import type { StoreResult } from '@/domain/models/StoreResult'

// ─── Minimal mock StoreResult factory ─────────────────
function mockResult(overrides: Partial<StoreResult> = {}): StoreResult {
  return {
    storeId: 's1',
    totalSales: 1000000,
    totalCustomers: 500,
    averageCustomersPerDay: null,
    totalPurchasePrice: 800000,
    totalPurchaseCost: 750000,
    openingInventory: null,
    closingInventory: null,
    invMethodCogs: null,
    invMethodGrossProfit: null,
    invMethodGrossProfitRate: 0.20,
    estMethodCogs: null,
    estMethodMargin: null,
    estMethodMarginRate: 0.22,
    estMethodClosingInventory: null,
    budget: 1200000,
    grossProfitBudget: null,
    grossProfitRateBudget: null,
    budgetDaily: new Map(),
    elapsedDays: 15,
    salesDays: 15,
    averageDailySales: 66667,
    projectedSales: 1333340,
    projectedAchievement: null,
    budgetAchievementRate: 0.83,
    budgetProgressRate: 0.85,
    budgetElapsedRate: 0.5,
    remainingBudget: 200000,
    daily: new Map(),
    dailyCumulative: new Map(),
    categoryTotals: new Map(),
    supplierTotals: new Map(),
    transferDetails: { interStoreIn: { cost: 0, price: 0 }, interStoreOut: { cost: 0, price: 0 }, interDepartmentIn: { cost: 0, price: 0 }, interDepartmentOut: { cost: 0, price: 0 } },
    ...overrides,
  } as StoreResult
}

describe('alertSystem', () => {
  describe('DEFAULT_ALERT_RULES', () => {
    it('5つのデフォルトルールがある', () => {
      expect(DEFAULT_ALERT_RULES).toHaveLength(5)
    })

    it('全てのルールが有効である', () => {
      expect(DEFAULT_ALERT_RULES.every((r) => r.enabled)).toBe(true)
    })
  })

  describe('evaluateAlerts', () => {
    it('粗利率が目標を -2pt 以上下回った場合にアラートを発生させる', () => {
      const rules: AlertRule[] = [{
        id: 'test-gp',
        type: 'gp_rate_below_target',
        label: '粗利率低下',
        description: '',
        severity: 'critical',
        enabled: true,
        threshold: 0.02,
      }]

      const result = mockResult({ invMethodGrossProfitRate: 0.20 })
      const alerts = evaluateAlerts('s1', 'テスト店', result, rules, {
        targetGrossProfitRate: 0.25,
      })

      // 25% - 20% = 5pt > 2pt threshold → alert
      expect(alerts).toHaveLength(1)
      expect(alerts[0].severity).toBe('critical')
      expect(alerts[0].value).toBe(0.20)
    })

    it('粗利率が目標に近い場合はアラートを発生させない', () => {
      const rules: AlertRule[] = [{
        id: 'test-gp',
        type: 'gp_rate_below_target',
        label: '粗利率低下',
        description: '',
        severity: 'critical',
        enabled: true,
        threshold: 0.02,
      }]

      const result = mockResult({ invMethodGrossProfitRate: 0.24 })
      const alerts = evaluateAlerts('s1', 'テスト店', result, rules, {
        targetGrossProfitRate: 0.25,
      })

      // 25% - 24% = 1pt < 2pt threshold → no alert
      expect(alerts).toHaveLength(0)
    })

    it('予算進捗率が閾値未満でアラートを発生させる', () => {
      const rules: AlertRule[] = [{
        id: 'test-budget',
        type: 'budget_achievement_below',
        label: '予算進捗不足',
        description: '',
        severity: 'warning',
        enabled: true,
        threshold: 0.90,
      }]

      const result = mockResult({ budgetProgressRate: 0.85 })
      const alerts = evaluateAlerts('s1', 'テスト店', result, rules, {
        targetGrossProfitRate: 0.25,
      })

      expect(alerts).toHaveLength(1)
      expect(alerts[0].severity).toBe('warning')
    })

    it('無効化されたルールはスキップする', () => {
      const rules: AlertRule[] = [{
        id: 'disabled',
        type: 'gp_rate_below_target',
        label: '無効ルール',
        description: '',
        severity: 'critical',
        enabled: false,
        threshold: 0.02,
      }]

      const result = mockResult({ invMethodGrossProfitRate: 0.10 })
      const alerts = evaluateAlerts('s1', 'テスト店', result, rules, {
        targetGrossProfitRate: 0.25,
      })

      expect(alerts).toHaveLength(0)
    })
  })

  describe('evaluateAllStoreAlerts', () => {
    it('複数店舗のアラートをseverity順にソートする', () => {
      const rules: AlertRule[] = [
        {
          id: 'gp', type: 'gp_rate_below_target', label: 'GP',
          description: '', severity: 'critical', enabled: true, threshold: 0.02,
        },
        {
          id: 'budget', type: 'budget_achievement_below', label: '予算',
          description: '', severity: 'warning', enabled: true, threshold: 0.90,
        },
      ]

      const results = new Map([
        ['s1', mockResult({ invMethodGrossProfitRate: 0.20, budgetProgressRate: 0.95 })],
        ['s2', mockResult({ invMethodGrossProfitRate: 0.30, budgetProgressRate: 0.85 })],
      ])

      const storeNames = new Map([['s1', '店舗A'], ['s2', '店舗B']])
      const alerts = evaluateAllStoreAlerts(results, storeNames, rules, {
        targetGrossProfitRate: 0.25,
      })

      // s1: GP critical, s2: budget warning
      expect(alerts.length).toBeGreaterThanOrEqual(2)
      // critical が先に来る
      expect(alerts[0].severity).toBe('critical')
    })
  })
})
