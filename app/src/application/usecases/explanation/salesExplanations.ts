/**
 * 売上系・原価系・売変系・値入率系の Explanation ビルダー
 *
 * ExplanationService から抽出。registerBudgetExplanations と同じ
 * register パターンで map に Explanation を登録する。
 *
 * @responsibility R:unclassified
 */
import type {
  MetricId,
  Explanation,
  BreakdownDetail,
  BreakdownEntry,
} from '@/domain/models/analysis'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { MonthlyData } from '@/domain/models/MonthlyData'
import { aggregateForStore, getDailyTotalCost } from '@/domain/models/record'
import {
  inp,
  dailyBreakdown,
  supplierDetails,
  costComponentDetails,
  salesComponentDetails,
  expandDailyEvidence,
} from './explanationHelpers'

/**
 * 売上・原価・売変・値入率の Explanation を map に登録する
 */
export function registerSalesExplanations(
  map: Map<MetricId, Explanation>,
  result: StoreResult,
  data: MonthlyData,
  scope: Explanation['scope'],
  storeId: string,
  allStoreIds: string[],
): void {
  // ─── 売上系 ──────────────────────────────────────────

  map.set('salesTotal', {
    metric: 'salesTotal',
    title: '総売上高',
    formula: '総売上高 = Σ 日別売上高',
    value: result.totalSales,
    unit: 'yen',
    scope,
    inputs: [
      inp('日別売上合計', result.totalSales, 'yen'),
      inp('営業日数', result.salesDays, 'count'),
    ],
    breakdown: dailyBreakdown(result.daily, (r) => r.sales, salesComponentDetails),
    evidenceRefs: expandDailyEvidence('classifiedSales', storeId, result.daily, allStoreIds),
  })

  map.set('coreSales', {
    metric: 'coreSales',
    title: 'コア売上高',
    formula: 'コア売上 = 総売上 - 花売価 - 産直売価',
    value: result.totalCoreSales,
    unit: 'yen',
    scope,
    inputs: [
      inp('総売上高', result.totalSales, 'yen', 'salesTotal'),
      inp('花売価', result.flowerSalesPrice, 'yen'),
      inp('産直売価', result.directProduceSalesPrice, 'yen'),
    ],
    evidenceRefs: [
      ...expandDailyEvidence('classifiedSales', storeId, result.daily, allStoreIds),
      ...expandDailyEvidence('flowers', storeId, result.daily, allStoreIds),
      ...expandDailyEvidence('directProduce', storeId, result.daily, allStoreIds),
    ],
  })

  map.set('grossSales', {
    metric: 'grossSales',
    title: '粗売上高',
    formula: '粗売上 = 総売上 + 売変額',
    value: result.grossSales,
    unit: 'yen',
    scope,
    inputs: [
      inp('総売上高', result.totalSales, 'yen', 'salesTotal'),
      inp('売変額', result.totalDiscount, 'yen', 'discountTotal'),
    ],
    evidenceRefs: expandDailyEvidence('classifiedSales', storeId, result.daily, allStoreIds),
  })

  // ─── 原価系 ──────────────────────────────────────────

  map.set('purchaseCost', {
    metric: 'purchaseCost',
    title: '総仕入原価',
    formula: '総仕入原価 = Σ 日別仕入原価（仕入 + 花 + 産直 + 移動）',
    value: result.totalCost,
    unit: 'yen',
    scope,
    inputs: [
      inp('在庫仕入原価', result.inventoryCost, 'yen', 'inventoryCost'),
      inp('売上納品原価', result.deliverySalesCost, 'yen', 'deliverySalesCost'),
    ],
    breakdown: dailyBreakdown(result.daily, getDailyTotalCost, costComponentDetails),
    evidenceRefs: expandDailyEvidence('purchase', storeId, result.daily, allStoreIds),
  })

  map.set('inventoryCost', {
    metric: 'inventoryCost',
    title: '在庫仕入原価',
    formula: '在庫仕入原価 = 総仕入原価 - 売上納品原価',
    value: result.inventoryCost,
    unit: 'yen',
    scope,
    inputs: [
      inp('総仕入原価', result.totalCost, 'yen', 'purchaseCost'),
      inp('売上納品原価', result.deliverySalesCost, 'yen', 'deliverySalesCost'),
    ],
    breakdown: dailyBreakdown(
      result.daily,
      (r) => getDailyTotalCost(r) - r.deliverySales.cost,
      supplierDetails,
    ),
    evidenceRefs: expandDailyEvidence('purchase', storeId, result.daily, allStoreIds),
  })

  map.set('deliverySalesCost', {
    metric: 'deliverySalesCost',
    title: '売上納品原価',
    formula: '売上納品原価 = 花原価 + 産直原価',
    value: result.deliverySalesCost,
    unit: 'yen',
    scope,
    inputs: [inp('売上納品原価（花+産直）', result.deliverySalesCost, 'yen')],
    breakdown: dailyBreakdown(
      result.daily,
      (r) => r.deliverySales.cost,
      (r) => {
        const d: BreakdownDetail[] = []
        if (r.flowers.cost !== 0) d.push({ label: '花原価', value: r.flowers.cost, unit: 'yen' })
        if (r.directProduce.cost !== 0)
          d.push({ label: '産直原価', value: r.directProduce.cost, unit: 'yen' })
        return d
      },
    ),
    evidenceRefs: [
      ...expandDailyEvidence('flowers', storeId, result.daily, allStoreIds),
      ...expandDailyEvidence('directProduce', storeId, result.daily, allStoreIds),
    ],
  })

  // ─── 売変系 ──────────────────────────────────────────

  map.set('discountTotal', {
    metric: 'discountTotal',
    title: '売変額合計',
    formula: '売変額 = Σ 日別売変額',
    value: result.totalDiscount,
    unit: 'yen',
    scope,
    inputs: [inp('売変額合計', result.totalDiscount, 'yen')],
    breakdown: (() => {
      const entries: BreakdownEntry[] = []
      const csAgg = aggregateForStore(data.classifiedSales, storeId)
      for (const [dayStr, summary] of Object.entries(csAgg)) {
        entries.push({ day: Number(dayStr), value: summary.discount })
      }
      return entries.sort((a, b) => a.day - b.day)
    })(),
    evidenceRefs: expandDailyEvidence('classifiedSales', storeId, result.daily, allStoreIds),
  })

  map.set('discountRate', {
    metric: 'discountRate',
    title: '売変率',
    formula: '売変率 = 売変額 ÷ (売上 + 売変額)',
    value: result.discountRate,
    unit: 'rate',
    scope,
    inputs: [
      inp('売変額', result.totalDiscount, 'yen', 'discountTotal'),
      inp('総売上高', result.totalSales, 'yen', 'salesTotal'),
    ],
    evidenceRefs: [],
  })

  const discountLossWarnings = result.metricWarnings.get('discountLossCost') ?? []
  map.set('discountLossCost', {
    metric: 'discountLossCost',
    title: '売変ロス原価',
    formula: '売変ロス原価 = (1 - 値入率) × コア売上 × 売変率 ÷ (1 - 売変率)',
    value: result.discountLossCost,
    unit: 'yen',
    scope,
    inputs: [
      inp('コア値入率', result.coreMarkupRate, 'rate', 'coreMarkupRate'),
      inp('コア売上', result.totalCoreSales, 'yen', 'coreSales'),
      inp('売変率', result.discountRate, 'rate', 'discountRate'),
    ],
    evidenceRefs: [],
    warnings: discountLossWarnings.length > 0 ? discountLossWarnings : undefined,
  })

  // ─── 値入率 ──────────────────────────────────────────

  map.set('averageMarkupRate', {
    metric: 'averageMarkupRate',
    title: '平均値入率（全体）',
    formula: '平均値入率 = (仕入売価合計 - 仕入原価合計) ÷ 仕入売価合計',
    value: result.averageMarkupRate,
    unit: 'rate',
    scope,
    inputs: [inp('総仕入原価', result.totalCost, 'yen', 'purchaseCost')],
    evidenceRefs: expandDailyEvidence('purchase', storeId, result.daily, allStoreIds),
  })

  map.set('coreMarkupRate', {
    metric: 'coreMarkupRate',
    title: 'コア値入率',
    formula: 'コア値入率 = (仕入売価 + 移動売価 - 仕入原価 - 移動原価) ÷ (仕入売価 + 移動売価)',
    value: result.coreMarkupRate,
    unit: 'rate',
    scope,
    inputs: [inp('コア値入率', result.coreMarkupRate, 'rate')],
    evidenceRefs: [
      ...expandDailyEvidence('purchase', storeId, result.daily, allStoreIds),
      ...expandDailyEvidence('interStoreIn', storeId, result.daily, allStoreIds),
      ...expandDailyEvidence('interStoreOut', storeId, result.daily, allStoreIds),
    ],
  })
}
