/**
 * ExplanationService
 *
 * StoreResult と入力データから、各指標の「説明」を生成する。
 * Domain 層の計算ロジックは変更せず、計算結果の構造から
 * 式・入力値・日別内訳・根拠参照を組み立てる。
 *
 * 設計原則:
 * - Domain 層に依存しない（型のみ参照）
 * - 計算を再実行しない（StoreResult の値をそのまま使う）
 * - 式の文字列は人間可読な日本語表記
 */
import type {
  StoreResult,
  ImportedData,
  AppSettings,
  MetricId,
  Explanation,
  BreakdownDetail,
  StoreExplanations,
} from '@/domain/models'
import { resolveFormulaDetail } from './formulaResolver'
import { registerBudgetExplanations } from './budgetExplanations'
import { registerSalesExplanations } from './salesExplanations'
import { inp, dailyBreakdown, expandDailyEvidence } from './explanationHelpers'

// 後方互換: 既存の import パスを壊さないために re-export する
export { generateTextSummary, generateMetricSummary } from './summaryGenerator'

/**
 * StoreResult から全指標の Explanation を生成する
 */
export function generateExplanations(
  result: StoreResult,
  data: ImportedData,
  settings: AppSettings,
): StoreExplanations {
  const { storeId } = result
  const scope = { storeId, year: settings.targetYear, month: settings.targetMonth }
  const allStoreIds = [...data.stores.keys()]
  const map = new Map<MetricId, Explanation>()

  // ─── 売上・原価・売変・値入率 ─────────────────────────
  registerSalesExplanations(map, result, data, scope, storeId, allStoreIds)

  // ─── 在庫法 ──────────────────────────────────────────

  if (result.invMethodCogs !== null) {
    map.set('invMethodCogs', {
      metric: 'invMethodCogs',
      title: '売上原価（在庫法・実績）',
      formula: '売上原価 = 期首在庫 + 総仕入原価 - 期末在庫',
      value: result.invMethodCogs,
      unit: 'yen',
      scope,
      inputs: [
        inp('期首在庫', result.openingInventory ?? 0, 'yen'),
        inp('総仕入原価', result.totalCost, 'yen', 'purchaseCost'),
        inp('期末在庫', result.closingInventory ?? 0, 'yen'),
      ],
      evidenceRefs: [
        { kind: 'aggregate', dataType: 'settings', storeId },
        ...expandDailyEvidence('purchase', storeId, result.daily, allStoreIds),
      ],
    })

    map.set('invMethodGrossProfit', {
      metric: 'invMethodGrossProfit',
      title: '実績粗利益（在庫法）',
      formula: '実績粗利益 = 総売上高 - 売上原価',
      value: result.invMethodGrossProfit!,
      unit: 'yen',
      scope,
      inputs: [
        inp('総売上高', result.totalSales, 'yen', 'salesTotal'),
        inp('売上原価', result.invMethodCogs, 'yen', 'invMethodCogs'),
      ],
      evidenceRefs: [],
    })

    map.set('invMethodGrossProfitRate', {
      metric: 'invMethodGrossProfitRate',
      title: '実績粗利率（在庫法）',
      formula: '実績粗利率 = 実績粗利益 ÷ 総売上高',
      value: result.invMethodGrossProfitRate!,
      unit: 'rate',
      scope,
      inputs: [
        inp('粗利益', result.invMethodGrossProfit!, 'yen', 'invMethodGrossProfit'),
        inp('総売上高', result.totalSales, 'yen', 'salesTotal'),
      ],
      evidenceRefs: [],
    })
  }

  // ─── 推定法 ──────────────────────────────────────────

  const estWarnings = result.metricWarnings.get('estMethodCogs') ?? []
  const estWarningNote = estWarnings.length > 0 ? `\n\n⚠ ${estWarnings.join('\n⚠ ')}` : ''

  map.set('estMethodCogs', {
    metric: 'estMethodCogs',
    title: '推定原価（推定法・理論値）',
    formula: '推定原価 = コア売上 ÷ (1 - 売変率) × (1 - 値入率) + 原価算入費' + estWarningNote,
    value: result.estMethodCogs,
    unit: 'yen',
    scope,
    inputs: [
      inp('コア売上', result.totalCoreSales, 'yen', 'coreSales'),
      inp('売変率', result.discountRate, 'rate', 'discountRate'),
      inp('コア値入率', result.coreMarkupRate, 'rate', 'coreMarkupRate'),
      inp('原価算入費', result.totalCostInclusion, 'yen', 'totalCostInclusion'),
    ],
    evidenceRefs: [],
  })

  map.set('estMethodMargin', {
    metric: 'estMethodMargin',
    title: '推定マージン（推定法・理論値）',
    formula: '推定マージン = コア売上 - 推定原価' + estWarningNote,
    value: result.estMethodMargin,
    unit: 'yen',
    scope,
    inputs: [
      inp('コア売上', result.totalCoreSales, 'yen', 'coreSales'),
      inp('推定原価', result.estMethodCogs, 'yen', 'estMethodCogs'),
    ],
    evidenceRefs: [],
  })

  map.set('estMethodMarginRate', {
    metric: 'estMethodMarginRate',
    title: '推定マージン率（推定法・理論値）',
    formula: '推定マージン率 = 推定マージン ÷ コア売上' + estWarningNote,
    value: result.estMethodMarginRate,
    unit: 'rate',
    scope,
    inputs: [
      inp('推定マージン', result.estMethodMargin, 'yen', 'estMethodMargin'),
      inp('コア売上', result.totalCoreSales, 'yen', 'coreSales'),
    ],
    evidenceRefs: [],
  })

  if (result.estMethodClosingInventory !== null) {
    map.set('estMethodClosingInventory', {
      metric: 'estMethodClosingInventory',
      title: '推定期末在庫（推定法・理論値）',
      formula: '推定期末在庫 = 期首在庫 + 在庫仕入原価 - 推定原価',
      value: result.estMethodClosingInventory,
      unit: 'yen',
      scope,
      inputs: [
        inp('期首在庫', result.openingInventory ?? 0, 'yen'),
        inp('在庫仕入原価', result.inventoryCost, 'yen', 'inventoryCost'),
        inp('推定原価', result.estMethodCogs, 'yen', 'estMethodCogs'),
      ],
      evidenceRefs: [{ kind: 'aggregate', dataType: 'settings', storeId }],
    })
  }

  // ─── 客数・消耗品 ────────────────────────────────────

  map.set('totalCustomers', {
    metric: 'totalCustomers',
    title: '来店客数',
    formula: '来店客数 = Σ 日別客数',
    value: result.totalCustomers,
    unit: 'count',
    scope,
    inputs: [
      inp('来店客数合計', result.totalCustomers, 'count'),
      inp('営業日数', result.salesDays, 'count'),
      inp('日平均客数', result.averageCustomersPerDay, 'count'),
    ],
    breakdown: dailyBreakdown(result.daily, (r) => r.customers ?? 0),
    evidenceRefs: expandDailyEvidence('flowers', storeId, result.daily, allStoreIds),
  })

  map.set('totalCostInclusion', {
    metric: 'totalCostInclusion',
    title: '原価算入費',
    formula: '原価算入費 = Σ 日別原価算入費',
    value: result.totalCostInclusion,
    unit: 'yen',
    scope,
    inputs: [
      inp('原価算入費合計', result.totalCostInclusion, 'yen'),
      inp('原価算入率', result.costInclusionRate, 'rate'),
    ],
    breakdown: dailyBreakdown(
      result.daily,
      (r) => r.costInclusion.cost,
      (r) => {
        const d: BreakdownDetail[] = []
        for (const item of r.costInclusion.items) {
          d.push({ label: item.itemName || item.itemCode, value: item.cost, unit: 'yen' })
        }
        return d
      },
    ),
    evidenceRefs: expandDailyEvidence('consumables', storeId, result.daily, allStoreIds),
  })

  // ─── 予算系 ──────────────────────────────────────────

  registerBudgetExplanations(map, result, scope, storeId)

  // ─── FORMULA_REGISTRY 解決 ─────────────────────────────
  for (const [metricId, exp] of map) {
    const detail = resolveFormulaDetail(metricId)
    if (detail) {
      map.set(metricId, { ...exp, formulaDetail: detail })
    }
  }

  return map
}
