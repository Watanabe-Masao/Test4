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
    invMethodGrossProfitRate: 0.2,
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
    transferDetails: {
      interStoreIn: { cost: 0, price: 0 },
      interStoreOut: { cost: 0, price: 0 },
      interDepartmentIn: { cost: 0, price: 0 },
      interDepartmentOut: { cost: 0, price: 0 },
    },
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
      const rules: AlertRule[] = [
        {
          id: 'test-gp',
          type: 'gp_rate_below_target',
          label: '粗利率低下',
          description: '',
          severity: 'critical',
          enabled: true,
          threshold: 0.02,
        },
      ]

      const result = mockResult({ invMethodGrossProfitRate: 0.2 })
      const alerts = evaluateAlerts('s1', 'テスト店', result, rules, {
        targetGrossProfitRate: 0.25,
      })

      // 25% - 20% = 5pt > 2pt threshold → alert
      expect(alerts).toHaveLength(1)
      expect(alerts[0].severity).toBe('critical')
      expect(alerts[0].value).toBe(0.2)
    })

    it('粗利率が目標に近い場合はアラートを発生させない', () => {
      const rules: AlertRule[] = [
        {
          id: 'test-gp',
          type: 'gp_rate_below_target',
          label: '粗利率低下',
          description: '',
          severity: 'critical',
          enabled: true,
          threshold: 0.02,
        },
      ]

      const result = mockResult({ invMethodGrossProfitRate: 0.24 })
      const alerts = evaluateAlerts('s1', 'テスト店', result, rules, {
        targetGrossProfitRate: 0.25,
      })

      // 25% - 24% = 1pt < 2pt threshold → no alert
      expect(alerts).toHaveLength(0)
    })

    it('予算進捗率が閾値未満でアラートを発生させる', () => {
      const rules: AlertRule[] = [
        {
          id: 'test-budget',
          type: 'budget_achievement_below',
          label: '予算進捗不足',
          description: '',
          severity: 'warning',
          enabled: true,
          threshold: 0.9,
        },
      ]

      const result = mockResult({ budgetProgressRate: 0.85 })
      const alerts = evaluateAlerts('s1', 'テスト店', result, rules, {
        targetGrossProfitRate: 0.25,
      })

      expect(alerts).toHaveLength(1)
      expect(alerts[0].severity).toBe('warning')
    })

    it('日次売上が前年比80%未満でアラートを発生させる', () => {
      const rules: AlertRule[] = [
        {
          id: 'test-daily',
          type: 'daily_sales_below_prev_year',
          label: '前年比低下',
          description: '',
          severity: 'warning',
          enabled: true,
          threshold: 0.8,
        },
      ]

      const daily = new Map([
        [
          1,
          {
            sales: 70000,
            costInclusion: { cost: 0 },
            discountAmount: 0,
          } as never,
        ],
      ])
      const result = mockResult({ daily })
      const alerts = evaluateAlerts('s1', 'テスト店', result, rules, {
        targetGrossProfitRate: 0.25,
        prevYearDailySales: new Map([[1, 100000]]),
      })

      // 70000/100000 = 70% < 80% → alert
      expect(alerts).toHaveLength(1)
      expect(alerts[0].day).toBe(1)
    })

    it('日次売上が前年比80%以上ならアラートなし', () => {
      const rules: AlertRule[] = [
        {
          id: 'test-daily',
          type: 'daily_sales_below_prev_year',
          label: '前年比低下',
          description: '',
          severity: 'warning',
          enabled: true,
          threshold: 0.8,
        },
      ]

      const daily = new Map([
        [
          1,
          {
            sales: 90000,
            costInclusion: { cost: 0 },
            discountAmount: 0,
          } as never,
        ],
      ])
      const result = mockResult({ daily })
      const alerts = evaluateAlerts('s1', 'テスト店', result, rules, {
        targetGrossProfitRate: 0.25,
        prevYearDailySales: new Map([[1, 100000]]),
      })

      expect(alerts).toHaveLength(0)
    })

    it('前年データがない場合はdaily_sales_below_prev_yearをスキップする', () => {
      const rules: AlertRule[] = [
        {
          id: 'test-daily',
          type: 'daily_sales_below_prev_year',
          label: '前年比低下',
          description: '',
          severity: 'warning',
          enabled: true,
          threshold: 0.8,
        },
      ]

      const daily = new Map([
        [1, { sales: 50000, costInclusion: { cost: 0 }, discountAmount: 0 } as never],
      ])
      const result = mockResult({ daily })
      const alerts = evaluateAlerts('s1', 'テスト店', result, rules, {
        targetGrossProfitRate: 0.25,
      })

      expect(alerts).toHaveLength(0)
    })

    it('前年売上がゼロの日はスキップする', () => {
      const rules: AlertRule[] = [
        {
          id: 'test-daily',
          type: 'daily_sales_below_prev_year',
          label: '前年比低下',
          description: '',
          severity: 'warning',
          enabled: true,
          threshold: 0.8,
        },
      ]

      const daily = new Map([
        [1, { sales: 50000, costInclusion: { cost: 0 }, discountAmount: 0 } as never],
      ])
      const result = mockResult({ daily })
      const alerts = evaluateAlerts('s1', 'テスト店', result, rules, {
        targetGrossProfitRate: 0.25,
        prevYearDailySales: new Map([[1, 0]]),
      })

      expect(alerts).toHaveLength(0)
    })

    it('消耗品比率が閾値超過でアラートを発生させる', () => {
      const rules: AlertRule[] = [
        {
          id: 'test-cons',
          type: 'consumable_ratio_above',
          label: '消耗品超過',
          description: '',
          severity: 'warning',
          enabled: true,
          threshold: 0.03,
        },
      ]

      const daily = new Map([
        [1, { sales: 500000, costInclusion: { cost: 25000 }, discountAmount: 0 } as never],
        [2, { sales: 500000, costInclusion: { cost: 25000 }, discountAmount: 0 } as never],
      ])
      const result = mockResult({ totalSales: 1000000, daily })
      const alerts = evaluateAlerts('s1', 'テスト店', result, rules, {
        targetGrossProfitRate: 0.25,
      })

      // 50000/1000000 = 5% > 3% → alert
      expect(alerts).toHaveLength(1)
      expect(alerts[0].ruleId).toBe('test-cons')
    })

    it('消耗品比率が閾値以下ならアラートなし', () => {
      const rules: AlertRule[] = [
        {
          id: 'test-cons',
          type: 'consumable_ratio_above',
          label: '消耗品超過',
          description: '',
          severity: 'warning',
          enabled: true,
          threshold: 0.03,
        },
      ]

      const daily = new Map([
        [1, { sales: 1000000, costInclusion: { cost: 10000 }, discountAmount: 0 } as never],
      ])
      const result = mockResult({ totalSales: 1000000, daily })
      const alerts = evaluateAlerts('s1', 'テスト店', result, rules, {
        targetGrossProfitRate: 0.25,
      })

      expect(alerts).toHaveLength(0)
    })

    it('売上ゼロで消耗品ルールをスキップする', () => {
      const rules: AlertRule[] = [
        {
          id: 'test-cons',
          type: 'consumable_ratio_above',
          label: '消耗品超過',
          description: '',
          severity: 'warning',
          enabled: true,
          threshold: 0.03,
        },
      ]

      const daily = new Map([
        [1, { sales: 0, costInclusion: { cost: 1000 }, discountAmount: 0 } as never],
      ])
      const result = mockResult({ totalSales: 0, daily })
      const alerts = evaluateAlerts('s1', 'テスト店', result, rules, {
        targetGrossProfitRate: 0.25,
      })

      expect(alerts).toHaveLength(0)
    })

    it('売変率が閾値超過でアラートを発生させる', () => {
      const rules: AlertRule[] = [
        {
          id: 'test-disc',
          type: 'discount_rate_above',
          label: '売変超過',
          description: '',
          severity: 'info',
          enabled: true,
          threshold: 0.05,
        },
      ]

      const daily = new Map([
        [1, { sales: 500000, costInclusion: { cost: 0 }, discountAmount: 40000 } as never],
        [2, { sales: 500000, costInclusion: { cost: 0 }, discountAmount: 40000 } as never],
      ])
      const result = mockResult({ totalSales: 1000000, daily })
      const alerts = evaluateAlerts('s1', 'テスト店', result, rules, {
        targetGrossProfitRate: 0.25,
      })

      // 80000/1000000 = 8% > 5% → alert
      expect(alerts).toHaveLength(1)
      expect(alerts[0].severity).toBe('info')
    })

    it('売変率が閾値以下ならアラートなし', () => {
      const rules: AlertRule[] = [
        {
          id: 'test-disc',
          type: 'discount_rate_above',
          label: '売変超過',
          description: '',
          severity: 'info',
          enabled: true,
          threshold: 0.05,
        },
      ]

      const daily = new Map([
        [1, { sales: 1000000, costInclusion: { cost: 0 }, discountAmount: 30000 } as never],
      ])
      const result = mockResult({ totalSales: 1000000, daily })
      const alerts = evaluateAlerts('s1', 'テスト店', result, rules, {
        targetGrossProfitRate: 0.25,
      })

      expect(alerts).toHaveLength(0)
    })

    it('売上ゼロで売変ルールをスキップする', () => {
      const rules: AlertRule[] = [
        {
          id: 'test-disc',
          type: 'discount_rate_above',
          label: '売変超過',
          description: '',
          severity: 'info',
          enabled: true,
          threshold: 0.05,
        },
      ]

      const daily = new Map([
        [1, { sales: 0, costInclusion: { cost: 0 }, discountAmount: 10000 } as never],
      ])
      const result = mockResult({ totalSales: 0, daily })
      const alerts = evaluateAlerts('s1', 'テスト店', result, rules, {
        targetGrossProfitRate: 0.25,
      })

      expect(alerts).toHaveLength(0)
    })

    it('無効化されたルールはスキップする', () => {
      const rules: AlertRule[] = [
        {
          id: 'disabled',
          type: 'gp_rate_below_target',
          label: '無効ルール',
          description: '',
          severity: 'critical',
          enabled: false,
          threshold: 0.02,
        },
      ]

      const result = mockResult({ invMethodGrossProfitRate: 0.1 })
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
          id: 'gp',
          type: 'gp_rate_below_target',
          label: 'GP',
          description: '',
          severity: 'critical',
          enabled: true,
          threshold: 0.02,
        },
        {
          id: 'budget',
          type: 'budget_achievement_below',
          label: '予算',
          description: '',
          severity: 'warning',
          enabled: true,
          threshold: 0.9,
        },
      ]

      const results = new Map([
        ['s1', mockResult({ invMethodGrossProfitRate: 0.2, budgetProgressRate: 0.95 })],
        ['s2', mockResult({ invMethodGrossProfitRate: 0.3, budgetProgressRate: 0.85 })],
      ])

      const storeNames = new Map([
        ['s1', '店舗A'],
        ['s2', '店舗B'],
      ])
      const alerts = evaluateAllStoreAlerts(results, storeNames, rules, {
        targetGrossProfitRate: 0.25,
      })

      // s1: GP critical, s2: budget warning
      expect(alerts.length).toBeGreaterThanOrEqual(2)
      // critical が先に来る
      expect(alerts[0].severity).toBe('critical')
    })

    it('店舗名がない場合はstoreIdをフォールバックに使う', () => {
      const rules: AlertRule[] = [
        {
          id: 'budget',
          type: 'budget_achievement_below',
          label: '予算',
          description: '',
          severity: 'warning',
          enabled: true,
          threshold: 0.9,
        },
      ]

      const results = new Map([['s99', mockResult({ budgetProgressRate: 0.5 })]])
      const storeNames = new Map<string, string>()
      const alerts = evaluateAllStoreAlerts(results, storeNames, rules, {
        targetGrossProfitRate: 0.25,
      })

      expect(alerts).toHaveLength(1)
      expect(alerts[0].storeName).toBe('s99')
    })

    it('店舗ごとの前年売上データを渡す', () => {
      const rules: AlertRule[] = [
        {
          id: 'daily',
          type: 'daily_sales_below_prev_year',
          label: '前年比',
          description: '',
          severity: 'warning',
          enabled: true,
          threshold: 0.8,
        },
      ]

      const daily = new Map([
        [1, { sales: 50000, costInclusion: { cost: 0 }, discountAmount: 0 } as never],
      ])
      const results = new Map([['s1', mockResult({ daily })]])
      const storeNames = new Map([['s1', '店舗A']])
      const prevYearDailySales = new Map([['s1', new Map([[1, 100000]])]])

      const alerts = evaluateAllStoreAlerts(results, storeNames, rules, {
        targetGrossProfitRate: 0.25,
        prevYearDailySales,
      })

      expect(alerts).toHaveLength(1)
      expect(alerts[0].day).toBe(1)
    })
  })
})
