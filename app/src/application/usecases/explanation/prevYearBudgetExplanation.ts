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
} from '@/domain/models'
import type { PrevYearMonthlyKpi, PrevYearMonthlyKpiEntry } from '@/application/hooks/usePrevYearMonthlyKpi'
import { safeDivide } from '@/domain/calculations/utils'

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
function buildEvidenceRefs(
  entry: PrevYearMonthlyKpiEntry,
  budgetStoreId: string,
): EvidenceRef[] {
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
 * PrevYearMonthlyKpiEntry → 日別 breakdown（前年売上の日別内訳）
 */
function buildDailyBreakdown(
  entry: PrevYearMonthlyKpiEntry,
  budgetDaily: ReadonlyMap<number, number>,
): BreakdownEntry[] {
  return entry.dailyMapping.map((row) => ({
    day: row.currentDay,
    value: row.prevSales,
    label: `前年${row.prevDay}日`,
    details: [
      { label: '前年売上', value: row.prevSales, unit: 'yen' as const },
      { label: '前年客数', value: row.prevCustomers, unit: 'count' as const },
      {
        label: '前年客単価',
        value: safeDivide(row.prevSales, row.prevCustomers, 0),
        unit: 'yen' as const,
      },
      {
        label: '当年予算',
        value: budgetDaily.get(row.currentDay) ?? 0,
        unit: 'yen' as const,
      },
    ],
  }))
}

interface PrevYearBudgetExplanationParams {
  readonly prevYearMonthlyKpi: PrevYearMonthlyKpi
  readonly budget: number
  readonly budgetDaily: ReadonlyMap<number, number>
  readonly storeId: string
  readonly year: number
  readonly month: number
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
  const { prevYearMonthlyKpi: pk, budget, budgetDaily, storeId, year, month } = params

  if (!pk.hasPrevYear || budget <= 0) return map

  const scope = { storeId, year, month }

  // ── 前年同曜日予算比 ──
  const sameDowRatio = safeDivide(pk.sameDow.sales, budget, 0)
  map.set('prevYearSameDowBudgetRatio', {
    metric: 'prevYearSameDowBudgetRatio',
    title: '前年同曜日予算比',
    formula: '前年同曜日予算比 = 前年同曜日売上 ÷ 当年月間予算',
    value: sameDowRatio,
    unit: 'rate',
    scope,
    inputs: [
      inp('前年同曜日売上', pk.sameDow.sales, 'yen'),
      inp('前年同曜日客数', pk.sameDow.customers, 'count'),
      inp(
        '前年同曜日客単価',
        safeDivide(pk.sameDow.sales, pk.sameDow.customers, 0),
        'yen',
      ),
      inp('当年月間予算', budget, 'yen', 'budget'),
      inp(
        '予算 ÷ 前年',
        safeDivide(budget, pk.sameDow.sales, 0),
        'rate',
      ),
    ],
    breakdown: buildDailyBreakdown(pk.sameDow, budgetDaily),
    evidenceRefs: buildEvidenceRefs(pk.sameDow, storeId),
  })

  // ── 前年同日予算比 ──
  const sameDateRatio = safeDivide(pk.sameDate.sales, budget, 0)
  map.set('prevYearSameDateBudgetRatio', {
    metric: 'prevYearSameDateBudgetRatio',
    title: '前年同日予算比',
    formula: '前年同日予算比 = 前年同日売上 ÷ 当年月間予算',
    value: sameDateRatio,
    unit: 'rate',
    scope,
    inputs: [
      inp('前年同日売上', pk.sameDate.sales, 'yen'),
      inp('前年同日客数', pk.sameDate.customers, 'count'),
      inp(
        '前年同日客単価',
        safeDivide(pk.sameDate.sales, pk.sameDate.customers, 0),
        'yen',
      ),
      inp('当年月間予算', budget, 'yen', 'budget'),
      inp(
        '予算 ÷ 前年',
        safeDivide(budget, pk.sameDate.sales, 0),
        'rate',
      ),
    ],
    breakdown: buildDailyBreakdown(pk.sameDate, budgetDaily),
    evidenceRefs: buildEvidenceRefs(pk.sameDate, storeId),
  })

  return map
}
