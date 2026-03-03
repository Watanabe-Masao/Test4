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
  ExplanationInput,
  EvidenceRef,
  BreakdownEntry,
  BreakdownDetail,
  StoreExplanations,
  DailyRecord,
} from '@/domain/models'
import { aggregateForStore, getDailyTotalCost } from '@/domain/models'
import { safeDivide, getEffectiveGrossProfitRate } from '@/domain/calculations/utils'

// ─── ヘルパー ──────────────────────────────────────────────

function inp(
  name: string,
  value: number,
  unit: Explanation['unit'],
  metric?: MetricId,
): ExplanationInput {
  return { name, value, unit, metric }
}

function dailyEvidence(
  dataType: EvidenceRef & { kind: 'daily' } extends { dataType: infer T } ? T : never,
  storeId: string,
  daily: ReadonlyMap<number, unknown>,
): EvidenceRef[] {
  const refs: EvidenceRef[] = []
  for (const day of daily.keys()) {
    refs.push({ kind: 'daily', dataType, storeId, day })
  }
  return refs
}

function dailyBreakdown(
  daily: ReadonlyMap<number, DailyRecord>,
  getter: (rec: DailyRecord) => number,
  detailsGetter?: (rec: DailyRecord) => BreakdownDetail[],
): BreakdownEntry[] {
  const entries: BreakdownEntry[] = []
  for (const [day, rec] of daily) {
    const entry: BreakdownEntry = {
      day,
      value: getter(rec),
      details: detailsGetter?.(rec),
    }
    entries.push(entry)
  }
  return entries.sort((a, b) => a.day - b.day)
}

/** 仕入日別の取引先内訳を生成 */
function supplierDetails(rec: DailyRecord): BreakdownDetail[] {
  const details: BreakdownDetail[] = []
  for (const [code, cp] of rec.supplierBreakdown) {
    details.push({ label: `取引先 ${code}`, value: cp.cost, unit: 'yen' })
  }
  return details
}

/**
 * 原価日別の構成内訳を生成
 *
 * getDailyTotalCost と同じ構成要素を列挙する。
 * getDailyTotalCost は全コンポーネントを加算するため、
 * ここでも符号を変えずにそのまま表示する。
 */
function costComponentDetails(rec: DailyRecord): BreakdownDetail[] {
  const details: BreakdownDetail[] = []
  if (rec.purchase.cost !== 0)
    details.push({ label: '仕入原価', value: rec.purchase.cost, unit: 'yen' })
  if (rec.interStoreIn.cost !== 0)
    details.push({ label: '店間入', value: rec.interStoreIn.cost, unit: 'yen' })
  if (rec.interStoreOut.cost !== 0)
    details.push({ label: '店間出', value: rec.interStoreOut.cost, unit: 'yen' })
  if (rec.interDepartmentIn.cost !== 0)
    details.push({ label: '部門間入', value: rec.interDepartmentIn.cost, unit: 'yen' })
  if (rec.interDepartmentOut.cost !== 0)
    details.push({ label: '部門間出', value: rec.interDepartmentOut.cost, unit: 'yen' })
  if (rec.deliverySales.cost !== 0)
    details.push({ label: '売上納品原価', value: rec.deliverySales.cost, unit: 'yen' })
  return details
}

/** 売上日別の構成内訳を生成 */
function salesComponentDetails(rec: DailyRecord): BreakdownDetail[] {
  const details: BreakdownDetail[] = []
  details.push({ label: 'コア売上', value: rec.coreSales, unit: 'yen' })
  if (rec.flowers.price !== 0)
    details.push({ label: '花売価', value: rec.flowers.price, unit: 'yen' })
  if (rec.directProduce.price !== 0)
    details.push({ label: '産直売価', value: rec.directProduce.price, unit: 'yen' })
  if (rec.deliverySales.price !== 0)
    details.push({ label: '売上納品売価', value: rec.deliverySales.price, unit: 'yen' })
  return details
}

// ─── 本体 ──────────────────────────────────────────────────

/**
 * aggregate storeId の場合、全店舗分の dailyEvidence を展開する
 */
function expandDailyEvidence(
  dataType: EvidenceRef & { kind: 'daily' } extends { dataType: infer T } ? T : never,
  storeId: string,
  daily: ReadonlyMap<number, unknown>,
  storeIds: readonly string[],
): EvidenceRef[] {
  if (storeId !== 'aggregate' || storeIds.length === 0) {
    return dailyEvidence(dataType, storeId, daily)
  }
  const refs: EvidenceRef[] = []
  for (const sid of storeIds) {
    for (const day of daily.keys()) {
      refs.push({ kind: 'daily', dataType, storeId: sid, day })
    }
  }
  return refs
}

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

  map.set('estMethodCogs', {
    metric: 'estMethodCogs',
    title: '推定原価（推定法・理論値）',
    formula: '推定原価 = コア売上 ÷ (1 - 売変率) × (1 - 値入率) + 消耗品費',
    value: result.estMethodCogs,
    unit: 'yen',
    scope,
    inputs: [
      inp('コア売上', result.totalCoreSales, 'yen', 'coreSales'),
      inp('売変率', result.discountRate, 'rate', 'discountRate'),
      inp('コア値入率', result.coreMarkupRate, 'rate', 'coreMarkupRate'),
      inp('消耗品費', result.totalConsumable, 'yen', 'totalConsumable'),
    ],
    evidenceRefs: [],
  })

  map.set('estMethodMargin', {
    metric: 'estMethodMargin',
    title: '推定マージン（推定法・理論値）',
    formula: '推定マージン = コア売上 - 推定原価',
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
    formula: '推定マージン率 = 推定マージン ÷ コア売上',
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

  // ─── 客数 ──────────────────────────────────────────

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

  // ─── 消耗品 ──────────────────────────────────────────

  map.set('totalConsumable', {
    metric: 'totalConsumable',
    title: '消耗品費',
    formula: '消耗品費 = Σ 日別消耗品費',
    value: result.totalConsumable,
    unit: 'yen',
    scope,
    inputs: [
      inp('消耗品費合計', result.totalConsumable, 'yen'),
      inp('消耗品率', result.consumableRate, 'rate'),
    ],
    breakdown: dailyBreakdown(
      result.daily,
      (r) => r.consumable.cost,
      (r) => {
        const d: BreakdownDetail[] = []
        for (const item of r.consumable.items) {
          d.push({ label: item.itemName || item.itemCode, value: item.cost, unit: 'yen' })
        }
        return d
      },
    ),
    evidenceRefs: expandDailyEvidence('consumables', storeId, result.daily, allStoreIds),
  })

  // ─── 予算系 ──────────────────────────────────────────

  map.set('budget', {
    metric: 'budget',
    title: '月間予算',
    formula: '予算 = 予算データ or デフォルト予算',
    value: result.budget,
    unit: 'yen',
    scope,
    inputs: [inp('月間予算', result.budget, 'yen')],
    evidenceRefs: [{ kind: 'aggregate', dataType: 'budget', storeId }],
  })

  map.set('budgetAchievementRate', {
    metric: 'budgetAchievementRate',
    title: '予算達成率',
    formula: '予算達成率 = 総売上 ÷ 月間予算',
    value: result.budgetAchievementRate,
    unit: 'rate',
    scope,
    inputs: [
      inp('総売上高', result.totalSales, 'yen', 'salesTotal'),
      inp('月間予算', result.budget, 'yen', 'budget'),
    ],
    evidenceRefs: [],
  })

  map.set('budgetProgressRate', {
    metric: 'budgetProgressRate',
    title: '予算消化率',
    formula: '予算消化率 = 総売上 ÷ 経過日予算累計',
    value: result.budgetProgressRate,
    unit: 'rate',
    scope,
    inputs: [
      inp('総売上高', result.totalSales, 'yen', 'salesTotal'),
      inp('経過日数', result.elapsedDays, 'count'),
    ],
    evidenceRefs: [],
  })

  map.set('projectedSales', {
    metric: 'projectedSales',
    title: '月末予測売上',
    formula: '月末予測 = 実績 + 日平均売上 × 残日数',
    value: result.projectedSales,
    unit: 'yen',
    scope,
    inputs: [
      inp('総売上高', result.totalSales, 'yen', 'salesTotal'),
      inp('日平均売上', result.averageDailySales, 'yen'),
      inp('経過日数', result.elapsedDays, 'count'),
    ],
    evidenceRefs: [],
  })

  map.set('remainingBudget', {
    metric: 'remainingBudget',
    title: '残余予算',
    formula: '残余予算 = 月間予算 - 総売上',
    value: result.remainingBudget,
    unit: 'yen',
    scope,
    inputs: [
      inp('月間予算', result.budget, 'yen', 'budget'),
      inp('総売上高', result.totalSales, 'yen', 'salesTotal'),
    ],
    evidenceRefs: [],
  })

  map.set('budgetElapsedRate', {
    metric: 'budgetElapsedRate',
    title: '経過予算率',
    formula: '経過予算率 = 経過予算累計 ÷ 月間予算',
    value: result.budgetElapsedRate,
    unit: 'rate',
    scope,
    inputs: [
      inp('経過日数', result.elapsedDays, 'count'),
      inp('月間予算', result.budget, 'yen', 'budget'),
    ],
    evidenceRefs: [],
  })

  map.set('budgetProgressGap', {
    metric: 'budgetProgressGap',
    title: '予算進捗ギャップ',
    formula: '進捗ギャップ = 消化率 − 経過率（正 = 前倒し、負 = 遅れ）',
    value: result.budgetProgressGap,
    unit: 'rate',
    scope,
    inputs: [
      inp('予算消化率', result.budgetProgressRate, 'rate', 'budgetProgressRate'),
      inp('経過予算率', result.budgetElapsedRate, 'rate', 'budgetElapsedRate'),
    ],
    evidenceRefs: [],
  })

  map.set('budgetVariance', {
    metric: 'budgetVariance',
    title: '予算差異',
    formula: '予算差異 = 累計実績 − 経過予算累計（正 = 予算超過ペース）',
    value: result.budgetVariance,
    unit: 'yen',
    scope,
    inputs: [
      inp('総売上高', result.totalSales, 'yen', 'salesTotal'),
      inp('経過日数', result.elapsedDays, 'count'),
    ],
    evidenceRefs: [],
  })

  map.set('requiredDailySales', {
    metric: 'requiredDailySales',
    title: '必要日次売上',
    formula: '必要日次売上 = 残余予算 ÷ 残日数',
    value: result.requiredDailySales,
    unit: 'yen',
    scope,
    inputs: [
      inp('残余予算', result.remainingBudget, 'yen', 'remainingBudget'),
      inp('経過日数', result.elapsedDays, 'count'),
    ],
    evidenceRefs: [],
  })

  map.set('averageDailySales', {
    metric: 'averageDailySales',
    title: '日平均売上',
    formula: '日平均売上 = 総売上 ÷ 営業日数',
    value: result.averageDailySales,
    unit: 'yen',
    scope,
    inputs: [
      inp('総売上高', result.totalSales, 'yen', 'salesTotal'),
      inp('営業日数', result.salesDays, 'count'),
    ],
    evidenceRefs: [],
  })

  map.set('projectedAchievement', {
    metric: 'projectedAchievement',
    title: '着地予測達成率',
    formula: '着地予測達成率 = 月末予測売上 ÷ 月間予算',
    value: result.projectedAchievement,
    unit: 'rate',
    scope,
    inputs: [
      inp('月末予測売上', result.projectedSales, 'yen', 'projectedSales'),
      inp('月間予算', result.budget, 'yen', 'budget'),
    ],
    evidenceRefs: [],
  })

  // ─── 粗利予算系 ────────────────────────────────────────

  map.set('grossProfitBudget', {
    metric: 'grossProfitBudget',
    title: '粗利予算',
    formula: '粗利予算 = 設定値',
    value: result.grossProfitBudget,
    unit: 'yen',
    scope,
    inputs: [inp('粗利予算', result.grossProfitBudget, 'yen')],
    evidenceRefs: [{ kind: 'aggregate', dataType: 'budget', storeId }],
  })

  map.set('grossProfitRateBudget', {
    metric: 'grossProfitRateBudget',
    title: '粗利率予算',
    formula: '粗利率予算 = 粗利予算 ÷ 売上予算',
    value: result.grossProfitRateBudget,
    unit: 'rate',
    scope,
    inputs: [
      inp('粗利予算', result.grossProfitBudget, 'yen', 'grossProfitBudget'),
      inp('売上予算', result.budget, 'yen', 'budget'),
    ],
    evidenceRefs: [],
  })

  if (result.grossProfitBudget > 0) {
    const gpActual = result.invMethodGrossProfit ?? result.estMethodMargin
    const gpBudgetAchievement = safeDivide(gpActual, result.grossProfitBudget, 0)

    map.set('grossProfitBudgetAchievement', {
      metric: 'grossProfitBudgetAchievement',
      title: '粗利予算達成率',
      formula: '粗利予算達成率 = 粗利実績 ÷ 粗利予算',
      value: gpBudgetAchievement,
      unit: 'rate',
      scope,
      inputs: [
        inp('粗利実績', gpActual, 'yen'),
        inp('粗利予算', result.grossProfitBudget, 'yen', 'grossProfitBudget'),
      ],
      evidenceRefs: [],
    })
  }

  return map
}

// ─── テキスト要約 ──────────────────────────────────────────────

/** 金額を日本語ロケールのカンマ区切りで表示 */
function fmtYen(n: number): string {
  return Math.round(n).toLocaleString('ja-JP')
}

/** 率を百分率で表示 (小数1桁) */
function fmtRate(n: number): string {
  return (n * 100).toFixed(1)
}

/**
 * StoreResult から主要指標の自然言語テキスト要約を生成する。
 * 例: "当月売上 12,345,678円（前年比 +5.2%）。粗利率 28.3%（目標比 -1.7pt）。
 *      主な要因: 客数 +3.1%、客単価 +2.0%。注意: 売変率 6.2%（前年 4.8%）。"
 */
export function generateTextSummary(
  result: StoreResult,
  options?: {
    prevYearResult?: StoreResult
    targetGrossProfitRate?: number
  },
): string {
  const prev = options?.prevYearResult
  const targetRate = options?.targetGrossProfitRate

  const lines: string[] = []

  // 1) 売上
  let salesLine = `当月売上 ${fmtYen(result.totalSales)}円`
  if (prev && prev.totalSales > 0) {
    const yoyRatio = safeDivide(result.totalSales - prev.totalSales, prev.totalSales)
    salesLine += `（前年比 ${yoyRatio >= 0 ? '+' : ''}${fmtRate(yoyRatio)}%）`
  }
  if (result.budget > 0) {
    salesLine += `。予算達成率 ${fmtRate(result.budgetAchievementRate)}` + '%'
  }
  lines.push(salesLine)

  // 2) 粗利率
  const gpRate = getEffectiveGrossProfitRate(result)
  let gpLine = `粗利率 ${fmtRate(gpRate)}%`
  if (result.invMethodGrossProfitRate !== null) {
    gpLine += '（在庫法）'
  } else {
    gpLine += '（推定法）'
  }
  if (targetRate !== undefined) {
    const diff = gpRate - targetRate
    gpLine += `（目標比 ${diff >= 0 ? '+' : ''}${(diff * 100).toFixed(1)}pt）`
  }
  if (prev) {
    const prevGpRate = getEffectiveGrossProfitRate(prev)
    const diff = gpRate - prevGpRate
    gpLine += `（前年比 ${diff >= 0 ? '+' : ''}${(diff * 100).toFixed(1)}pt）`
  }
  lines.push(gpLine)

  // 3) 客数・客単価（前年比がある場合）
  if (prev && prev.totalCustomers > 0 && result.totalCustomers > 0) {
    const custRatio = safeDivide(result.totalCustomers - prev.totalCustomers, prev.totalCustomers)
    const curTx = safeDivide(result.totalSales, result.totalCustomers)
    const prevTx = safeDivide(prev.totalSales, prev.totalCustomers)
    const txRatio = safeDivide(curTx - prevTx, prevTx)
    lines.push(
      `主な要因: 客数 ${custRatio >= 0 ? '+' : ''}${fmtRate(custRatio)}%` +
        `、客単価 ${txRatio >= 0 ? '+' : ''}${fmtRate(txRatio)}%`,
    )
  }

  // 4) 注意事項
  const warnings: string[] = []
  if (result.discountRate > 0.05) {
    let discountWarning = `売変率 ${fmtRate(result.discountRate)}%`
    if (prev) {
      discountWarning += `（前年 ${fmtRate(prev.discountRate)}%）`
    }
    warnings.push(discountWarning)
  }
  if (result.consumableRate > 0.03) {
    warnings.push(`消耗品率 ${fmtRate(result.consumableRate)}%`)
  }
  if (warnings.length > 0) {
    lines.push(`注意: ${warnings.join('、')}`)
  }

  return lines.join('。') + '。'
}

/**
 * 指定されたExplanationのテキスト要約を生成する（個別指標用）
 */
export function generateMetricSummary(explanation: Explanation): string {
  const { title, unit } = explanation
  let valueStr: string
  switch (unit) {
    case 'yen':
      valueStr = `${fmtYen(explanation.value)}円`
      break
    case 'rate':
      valueStr = `${fmtRate(explanation.value)}%`
      break
    case 'count':
      valueStr = explanation.value.toLocaleString('ja-JP')
      break
  }
  return `${title}: ${valueStr} (計算式: ${explanation.formula})`
}
