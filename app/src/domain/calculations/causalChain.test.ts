import { describe, it, expect } from 'vitest'
import { buildCausalSteps, storeResultToCausalPrev, type CausalChainPrevInput } from './causalChain'
import type { StoreResult, DiscountEntry } from '@/domain/models'

/**
 * テスト用の最小限 StoreResult。
 * テストに必要なフィールドのみ設定し、それ以外はゼロ / 空値。
 */
function makeResult(overrides: Partial<StoreResult> = {}): StoreResult {
  return {
    storeId: 'test',
    openingInventory: null,
    closingInventory: null,
    totalSales: 10_000_000,
    totalCoreSales: 9_000_000,
    deliverySalesPrice: 500_000,
    flowerSalesPrice: 300_000,
    directProduceSalesPrice: 200_000,
    grossSales: 10_500_000,
    totalCost: 7_000_000,
    inventoryCost: 6_500_000,
    deliverySalesCost: 500_000,
    invMethodCogs: null,
    invMethodGrossProfit: null,
    invMethodGrossProfitRate: null,
    estMethodCogs: 7_200_000,
    estMethodMargin: 1_800_000,
    estMethodMarginRate: 0.2,
    estMethodClosingInventory: null,
    totalCustomers: 5_000,
    averageCustomersPerDay: 250,
    totalDiscount: 500_000,
    discountRate: 0.048,
    discountLossCost: 100_000,
    discountEntries: [
      { type: '71', label: '見切', amount: 300_000 },
      { type: '72', label: '値引', amount: 150_000 },
      { type: '73', label: '廃棄', amount: 50_000 },
    ] as readonly DiscountEntry[],
    averageMarkupRate: 0.3,
    coreMarkupRate: 0.28,
    totalConsumable: 100_000,
    consumableRate: 0.01,
    budget: 12_000_000,
    grossProfitBudget: 3_000_000,
    grossProfitRateBudget: 0.25,
    budgetDaily: new Map(),
    daily: new Map(),
    categoryTotals: new Map(),
    supplierTotals: new Map(),
    transferDetails: {
      interStoreIn: { cost: 0, price: 0 },
      interStoreOut: { cost: 0, price: 0 },
      interDepartmentIn: { cost: 0, price: 0 },
      interDepartmentOut: { cost: 0, price: 0 },
    },
    purchaseMaxDay: 20,
    hasDiscountData: true,
    elapsedDays: 20,
    salesDays: 30,
    averageDailySales: 500_000,
    projectedSales: 15_000_000,
    projectedAchievement: 1.25,
    budgetAchievementRate: 0.83,
    budgetProgressRate: 1.0,
    budgetElapsedRate: 0.67,
    remainingBudget: 2_000_000,
    dailyCumulative: new Map(),
    ...overrides,
  } as StoreResult
}

describe('causalChain', () => {
  describe('buildCausalSteps', () => {
    it('前年データなしの場合、最低3ステップ（粗利率・要因分解・成分サマリー）を返す', () => {
      const steps = buildCausalSteps(makeResult(), undefined)

      expect(steps.length).toBeGreaterThanOrEqual(3)
      expect(steps[0].title).toBe('粗利率の状況')
      expect(steps[1].title).toBe('粗利率変動の要因分解')
      // 売変データがあるので売変種別内訳もある
      expect(steps[2].title).toBe('売変種別内訳')
      expect(steps[steps.length - 1].title).toBe('成分サマリー')
    })

    it('前年データなしでは前年比変動ファクターが含まれない', () => {
      const steps = buildCausalSteps(makeResult(), undefined)

      const step1Factors = steps[0].factors
      const prevYearFactor = step1Factors.find((f) => f.label === '前年比変動')
      expect(prevYearFactor).toBeUndefined()
    })

    it('前年データありで前年比変動ファクターが含まれる', () => {
      const current = makeResult({ estMethodMarginRate: 0.2 })
      const prevYear = storeResultToCausalPrev(makeResult({ estMethodMarginRate: 0.22 }))

      const steps = buildCausalSteps(current, prevYear)

      const step1Factors = steps[0].factors
      const prevYearFactor = step1Factors.find((f) => f.label === '前年比変動')
      expect(prevYearFactor).toBeDefined()
      expect(prevYearFactor!.formatted).toContain('-')
    })

    it('Step 1 insightに粗利率の構成成分（原価率/売変率/消耗品率）が含まれる', () => {
      const steps = buildCausalSteps(makeResult(), undefined)

      expect(steps[0].insight).toContain('原価率')
      expect(steps[0].insight).toContain('売変率')
      expect(steps[0].insight).toContain('消耗品率')
    })

    it('Step 1 insightに推奨文言や解釈が含まれない', () => {
      const current = makeResult({ estMethodMarginRate: 0.2 })
      const prevYear = storeResultToCausalPrev(makeResult({ estMethodMarginRate: 0.22 }))

      const steps = buildCausalSteps(current, prevYear)

      // 推奨・解釈的な表現を含まない
      expect(steps[0].insight).not.toContain('深堀り')
      expect(steps[0].insight).not.toContain('確認します')
      expect(steps[0].insight).not.toContain('検討')
    })

    it('要因分解で3つの成分変動ファクターが表示される', () => {
      const current = makeResult({ discountRate: 0.08 })
      const prevYear = storeResultToCausalPrev(makeResult({ discountRate: 0.03 }))

      const steps = buildCausalSteps(current, prevYear)

      const step2 = steps[1]
      expect(step2.factors).toHaveLength(3)
      expect(step2.factors.map((f) => f.label)).toEqual([
        '原価率変動',
        '売変率変動',
        '消耗品率変動',
      ])
    })

    it('前年データありでStep 2 insightにShapley分解が含まれる', () => {
      const current = makeResult({ totalSales: 10_000_000, totalCustomers: 5_000 })
      const prevYear = storeResultToCausalPrev(
        makeResult({ totalSales: 9_000_000, totalCustomers: 4_500 }),
      )

      const steps = buildCausalSteps(current, prevYear)

      expect(steps[1].insight).toContain('売上差')
      expect(steps[1].insight).toContain('客数効果')
      expect(steps[1].insight).toContain('客単価効果')
    })

    it('売変種別内訳で前年比の差分が計算される', () => {
      const current = makeResult({
        discountEntries: [
          { type: '71', label: '見切', amount: 500_000 },
          { type: '72', label: '値引', amount: 100_000 },
        ] as readonly DiscountEntry[],
      })
      const prevYear = storeResultToCausalPrev(
        makeResult({
          discountEntries: [
            { type: '71', label: '見切', amount: 300_000 },
            { type: '72', label: '値引', amount: 150_000 },
          ] as readonly DiscountEntry[],
        }),
      )

      const steps = buildCausalSteps(current, prevYear)
      const discountStep = steps.find((s) => s.title === '売変種別内訳')

      expect(discountStep).toBeDefined()
      // 見切: 50万→30万=+20万が最大変動
      expect(discountStep!.factors[0].formatted).toContain('+200,000')
    })

    it('売変データなしで売変種別内訳ステップがスキップされる', () => {
      const result = makeResult({ discountEntries: [] as readonly DiscountEntry[] })

      const steps = buildCausalSteps(result, undefined)

      const discountStep = steps.find((s) => s.title === '売変種別内訳')
      expect(discountStep).toBeUndefined()
    })

    it('成分サマリーに売上・客数・客単価が表示される', () => {
      const steps = buildCausalSteps(makeResult(), undefined)

      const summaryStep = steps[steps.length - 1]
      expect(summaryStep.title).toBe('成分サマリー')
      expect(summaryStep.insight).toContain('売上')
      expect(summaryStep.insight).toContain('客数')
      expect(summaryStep.insight).toContain('客単価')
    })

    it('前年データありで成分サマリーにShapleyファクター（客数効果・客単価効果）が含まれる', () => {
      const current = makeResult({ totalSales: 10_000_000, totalCustomers: 5_000 })
      const prevYear = storeResultToCausalPrev(
        makeResult({ totalSales: 9_000_000, totalCustomers: 4_500 }),
      )

      const steps = buildCausalSteps(current, prevYear)

      const summaryStep = steps[steps.length - 1]
      expect(summaryStep.factors.length).toBeGreaterThanOrEqual(2)
      expect(summaryStep.factors.map((f) => f.label)).toContain('客数効果')
      expect(summaryStep.factors.map((f) => f.label)).toContain('客単価効果')
    })

    it('Shapley恒等式: 客数効果 + 客単価効果 = 売上差', () => {
      const curSales = 10_000_000
      const prevSales = 9_000_000
      const current = makeResult({ totalSales: curSales, totalCustomers: 5_000 })
      const prevYear = storeResultToCausalPrev(
        makeResult({ totalSales: prevSales, totalCustomers: 4_500 }),
      )

      const steps = buildCausalSteps(current, prevYear)

      const summaryStep = steps[steps.length - 1]
      const custFactor = summaryStep.factors.find((f) => f.label === '客数効果')!
      const ticketFactor = summaryStep.factors.find((f) => f.label === '客単価効果')!

      // 符号は value ではなく formatted に含まれる。value は absolute.
      // formatted からパースして合計チェック
      const custVal = parseYen(custFactor.formatted)
      const ticketVal = parseYen(ticketFactor.formatted)

      expect(custVal + ticketVal).toBeCloseTo(curSales - prevSales, 0)
    })

    it('成分サマリーに推奨文言が一切含まれない', () => {
      const current = makeResult({ discountRate: 0.08 })
      const prevYear = storeResultToCausalPrev(makeResult({ discountRate: 0.03 }))

      const steps = buildCausalSteps(current, prevYear)

      const summaryStep = steps[steps.length - 1]
      // 推奨・解釈的な表現を含まない
      expect(summaryStep.insight).not.toContain('検討')
      expect(summaryStep.insight).not.toContain('確認')
      expect(summaryStep.insight).not.toContain('してください')
      expect(summaryStep.insight).not.toContain('モニタリング')
      expect(summaryStep.insight).not.toContain('継続')
    })

    it('在庫法粗利率がある場合はそちらを優先する', () => {
      const result = makeResult({
        invMethodGrossProfitRate: 0.25,
        estMethodMarginRate: 0.2,
      })

      const steps = buildCausalSteps(result, undefined)

      // 25.0% が表示される（推定法の20%ではなく）
      expect(steps[0].description).toContain('25.0%')
    })

    it('予算粗利率が0の場合、予算比変動ファクターが含まれない', () => {
      const result = makeResult({ grossProfitRateBudget: 0 })

      const steps = buildCausalSteps(result, undefined)

      const budgetFactor = steps[0].factors.find((f) => f.label === '予算比変動')
      expect(budgetFactor).toBeUndefined()
    })

    it('部分的な前年データ（PrevYearData由来）でも売変率比較が行える', () => {
      const current = makeResult({ discountRate: 0.06 })
      const partialPrev: CausalChainPrevInput = {
        grossProfitRate: null,
        costRate: null,
        discountRate: 0.03,
        consumableRate: null,
        discountEntries: [],
        totalSales: null,
        totalCustomers: null,
      }

      const steps = buildCausalSteps(current, partialPrev)

      // 粗利率の前年比較はできない（grossProfitRate: null）
      const step1 = steps[0]
      const prevYearFactor = step1.factors.find((f) => f.label === '前年比変動')
      expect(prevYearFactor).toBeUndefined()

      // 売変率の比較は可能
      const step2 = steps[1]
      const discountFactor = step2.factors.find((f) => f.label === '売変率変動')
      expect(discountFactor).toBeDefined()
      expect(discountFactor!.formatted).toContain('+')
    })

    it('部分的な前年データでShapley分解が省略される（totalSales/totalCustomers null）', () => {
      const partialPrev: CausalChainPrevInput = {
        grossProfitRate: null,
        costRate: null,
        discountRate: 0.03,
        consumableRate: null,
        discountEntries: [],
        totalSales: null,
        totalCustomers: null,
      }

      const steps = buildCausalSteps(makeResult(), partialPrev)

      const summaryStep = steps[steps.length - 1]
      // Shapleyファクターが含まれない
      expect(summaryStep.factors.find((f) => f.label === '客数効果')).toBeUndefined()
    })
  })

  describe('storeResultToCausalPrev', () => {
    it('StoreResult から CausalChainPrevInput を正しく変換する', () => {
      const result = makeResult({
        invMethodGrossProfitRate: 0.25,
        estMethodMarginRate: 0.2,
        inventoryCost: 6_500_000,
        deliverySalesCost: 500_000,
        grossSales: 10_000_000,
        discountRate: 0.05,
        consumableRate: 0.01,
        totalSales: 10_000_000,
        totalCustomers: 5_000,
        discountEntries: [
          { type: '71', label: '見切', amount: 300_000 },
        ] as readonly DiscountEntry[],
      })

      const prev = storeResultToCausalPrev(result)

      expect(prev.grossProfitRate).toBe(0.25) // invMethod優先
      expect(prev.costRate).toBeCloseTo(0.7, 2) // (6.5M + 0.5M) / 10M
      expect(prev.discountRate).toBe(0.05)
      expect(prev.consumableRate).toBe(0.01)
      expect(prev.discountEntries).toHaveLength(1)
      expect(prev.totalSales).toBe(10_000_000)
      expect(prev.totalCustomers).toBe(5_000)
    })
  })
})

/** テストヘルパー: "±X,XXX円" から数値を抽出 */
function parseYen(s: string): number {
  const cleaned = s.replace(/[円,]/g, '').replace('+', '')
  return Number(cleaned)
}
