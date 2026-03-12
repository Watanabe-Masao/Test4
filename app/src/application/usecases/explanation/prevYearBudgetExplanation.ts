/**
 * 前年予算比較の Explanation 生成
 *
 * ExplanationService 本体は StoreResult ベースだが、前年予算比較は
 * usePrevYearMonthlyKpi フックのデータを必要とするため、別関数として提供する。
 * useExplanations でマージして統合される。
 */
import type {
  MetricId,
  Explanation,
  ExplanationInput,
  EvidenceRef,
  BreakdownEntry,
  BreakdownDetail,
  Store,
} from '@/domain/models'
import type { DowGapAnalysis } from '@/domain/models/ComparisonContext'
import type {
  PrevYearMonthlyKpi,
  PrevYearMonthlyKpiEntry,
} from '@/application/hooks/usePrevYearMonthlyKpi'
import { safeDivide } from '@/domain/calculations/utils'
import { formatCurrency } from '@/domain/formatting'

function inp(
  name: string,
  value: number,
  unit: Explanation['unit'],
  metric?: MetricId,
): ExplanationInput {
  return { name, value, unit, metric }
}

/**
 * storeContributions → evidenceRefs（計算に寄与した前年データへの実参照）
 */
function buildEvidenceRefs(entry: PrevYearMonthlyKpiEntry, budgetStoreId: string): EvidenceRef[] {
  const refs: EvidenceRef[] = entry.storeContributions.map((c) => ({
    kind: 'daily' as const,
    dataType: 'classifiedSales' as const,
    storeId: c.storeId,
    day: c.originalDay,
  }))
  // 予算データへの参照
  refs.push({ kind: 'aggregate' as const, dataType: 'budget' as const, storeId: budgetStoreId })
  return refs
}

/**
 * PrevYearMonthlyKpiEntry → 日別 breakdown（予算対比の日別内訳）
 *
 * メイン値: 前年売上 ÷ 当日予算 = 予算対比率
 * 詳細: 対象日当年予算, 前年売上実績(→店舗内訳), 予算対比, 前年客数, 前年客単価
 */
const DOW_LABELS_SHORT = ['日', '月', '火', '水', '木', '金', '土'] as const

function formatPrevDayLabel(sourceYear: number, sourceMonth: number, prevDay: number): string {
  const d = new Date(sourceYear, sourceMonth - 1, prevDay)
  const dow = DOW_LABELS_SHORT[d.getDay()]
  const m = String(sourceMonth).padStart(2, '0')
  const day = String(prevDay).padStart(2, '0')
  return `${sourceYear}年${m}月${day}日 (${dow})`
}

function buildDailyBreakdown(
  entry: PrevYearMonthlyKpiEntry,
  budgetDaily: ReadonlyMap<number, number>,
  sourceYear: number,
  sourceMonth: number,
  stores?: ReadonlyMap<string, Store>,
): BreakdownEntry[] {
  // 店舗別の日別データを mappedDay でグループ化
  const storeByDay = new Map<number, { storeId: string; sales: number; customers: number }[]>()
  for (const sc of entry.storeContributions) {
    const list = storeByDay.get(sc.mappedDay)
    if (list) {
      const existing = list.find((e) => e.storeId === sc.storeId)
      if (existing) {
        existing.sales += sc.sales
        existing.customers += sc.customers
      } else {
        list.push({ storeId: sc.storeId, sales: sc.sales, customers: sc.customers })
      }
    } else {
      storeByDay.set(sc.mappedDay, [
        { storeId: sc.storeId, sales: sc.sales, customers: sc.customers },
      ])
    }
  }

  return entry.dailyMapping.map((row) => {
    const dayBudget = budgetDaily.get(row.currentDay) ?? 0
    const dayRatio = safeDivide(row.prevSales, dayBudget, 0)

    const details: BreakdownDetail[] = [
      { label: '対象日当年予算', value: dayBudget, unit: 'yen' },
      { label: '比較期売上実績', value: row.prevSales, unit: 'yen' },
    ]

    // 店舗別内訳（複数店舗がある場合のみ）
    const dayStores = storeByDay.get(row.currentDay)
    if (dayStores && dayStores.length > 1) {
      const sorted = [...dayStores].sort((a, b) => a.storeId.localeCompare(b.storeId))
      for (const s of sorted) {
        const name = stores?.get(s.storeId)?.name ?? s.storeId
        details.push({ label: `  ${name}`, value: s.sales, unit: 'yen' })
      }
    }

    details.push(
      { label: '予算対比', value: dayRatio, unit: 'rate' },
      { label: '比較期客数', value: row.prevCustomers, unit: 'count' },
      {
        label: '比較期客単価',
        value: safeDivide(row.prevSales, row.prevCustomers, 0),
        unit: 'yen',
      },
    )

    return {
      day: row.currentDay,
      value: dayRatio,
      unit: 'rate' as const,
      label: formatPrevDayLabel(sourceYear, sourceMonth, row.prevDay),
      details,
    }
  })
}

interface PrevYearBudgetExplanationParams {
  readonly prevYearMonthlyKpi: PrevYearMonthlyKpi
  readonly budget: number
  readonly budgetDaily: ReadonlyMap<number, number>
  readonly storeId: string
  readonly year: number
  readonly month: number
  /** 店舗マスタ（日別内訳の店舗名解決用） */
  readonly stores?: ReadonlyMap<string, Store>
  /** 曜日ギャップ分析結果 */
  readonly dowGap?: DowGapAnalysis
  /** 日平均売上（曜日ギャップ影響額計算に使用） */
  readonly averageDailySales?: number
}

/**
 * 前年予算比較の Explanation を生成する
 *
 * @returns prevYearSameDowBudgetRatio / prevYearSameDateBudgetRatio の Map
 */
export function generatePrevYearBudgetExplanations(
  params: PrevYearBudgetExplanationParams,
): ReadonlyMap<MetricId, Explanation> {
  const map = new Map<MetricId, Explanation>()
  const { prevYearMonthlyKpi: pk, budget, budgetDaily, storeId, year, month, stores } = params

  if (!pk.hasPrevYear || budget <= 0) return map

  const scope = { storeId, year, month }

  // ── 前年同曜日予算比 ──
  const sameDowRatio = safeDivide(pk.sameDow.sales, budget, 0)
  map.set('prevYearSameDowBudgetRatio', {
    metric: 'prevYearSameDowBudgetRatio',
    title: '比較期（同曜日）予算比',
    formula: '比較期（同曜日）予算比 = 比較期同曜日売上 ÷ 当期月間予算',
    value: sameDowRatio,
    unit: 'rate',
    scope,
    inputs: [
      inp('比較期同曜日売上', pk.sameDow.sales, 'yen'),
      inp('比較期同曜日客数', pk.sameDow.customers, 'count'),
      inp('比較期同曜日客単価', safeDivide(pk.sameDow.sales, pk.sameDow.customers, 0), 'yen'),
      inp('当期月間予算', budget, 'yen', 'budget'),
      inp('予算 ÷ 比較期', safeDivide(budget, pk.sameDow.sales, 0), 'rate'),
    ],
    breakdown: buildDailyBreakdown(pk.sameDow, budgetDaily, pk.sourceYear, pk.sourceMonth, stores),
    evidenceRefs: buildEvidenceRefs(pk.sameDow, storeId),
  })

  // ── 前年同日予算比 ──
  const sameDateRatio = safeDivide(pk.sameDate.sales, budget, 0)
  map.set('prevYearSameDateBudgetRatio', {
    metric: 'prevYearSameDateBudgetRatio',
    title: '比較期（同日）予算比',
    formula: '比較期（同日）予算比 = 比較期同日売上 ÷ 当期月間予算',
    value: sameDateRatio,
    unit: 'rate',
    scope,
    inputs: [
      inp('比較期同日売上', pk.sameDate.sales, 'yen'),
      inp('比較期同日客数', pk.sameDate.customers, 'count'),
      inp('比較期同日客単価', safeDivide(pk.sameDate.sales, pk.sameDate.customers, 0), 'yen'),
      inp('当期月間予算', budget, 'yen', 'budget'),
      inp('予算 ÷ 比較期', safeDivide(budget, pk.sameDate.sales, 0), 'rate'),
    ],
    breakdown: buildDailyBreakdown(pk.sameDate, budgetDaily, pk.sourceYear, pk.sourceMonth, stores),
    evidenceRefs: buildEvidenceRefs(pk.sameDate, storeId),
  })

  // ── 曜日ギャップ影響額 ──
  const { dowGap } = params
  if (dowGap && dowGap.isValid) {
    const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

    const dowInputs: ExplanationInput[] = []
    // 各曜日の日数差と前年曜日別日平均を入力パラメータに追加
    for (const dc of dowGap.dowCounts) {
      const dowAvg = dowGap.prevDowDailyAvg[dc.dow]
      const impact = dc.diff * dowAvg
      dowInputs.push(
        inp(
          `${DOW_LABELS[dc.dow]}曜: ${dc.previousCount}→${dc.currentCount} (${dc.diff >= 0 ? '+' : ''}${dc.diff}) × 日平均${formatCurrency(dowAvg)}`,
          impact,
          'yen',
        ),
      )
    }

    const warnings = dowGap.missingDataWarnings ?? []
    const formulaNote =
      warnings.length > 0
        ? `曜日ギャップ影響額 = Σ(比較期曜日別日平均売上 × 日数差)\n\n⚠ ${warnings.join('\n⚠ ')}`
        : '曜日ギャップ影響額 = Σ(比較期曜日別日平均売上 × 日数差)'

    map.set('dowGapImpact', {
      metric: 'dowGapImpact',
      title: '曜日ギャップ影響額',
      formula: formulaNote,
      value: dowGap.estimatedImpact,
      unit: 'yen',
      scope,
      inputs: dowInputs,
      evidenceRefs: [{ kind: 'aggregate' as const, dataType: 'budget' as const, storeId }],
    })
  }

  return map
}
