/**
 * 予算達成シミュレーター — ドリルダウン集計関数
 *
 * 週別 / 曜日別に dailyBudget / actualDaily / lyDaily を集計する pure function。
 * budgetSimulator.ts (core KPI/what-if) からサイズ制限 (G5) 対応で分離。
 *
 * @responsibility R:calculation
 */
import { dowOf, type SimulatorScenario } from './budgetSimulator'

/** 曜日別集計行 */
export interface DowAggregation {
  readonly dow: number // 0=日, 6=土
  readonly label: string
  readonly count: number
  readonly budgetTotal: number
  readonly actualTotal: number
  readonly lyTotal: number
  readonly budgetAvg: number
  readonly actualAvg: number
  readonly lyAvg: number
}

/** 週別集計行 */
export interface WeekAggregation {
  readonly weekIndex: number // 0-based
  readonly startDay: number // 1-based
  readonly endDay: number // 1-based (inclusive)
  readonly budgetTotal: number
  readonly actualTotal: number
  readonly lyTotal: number
  readonly achievement: number | null // actual / budget (%)
}

const DOW_LABELS_JP = ['日', '月', '火', '水', '木', '金', '土'] as const

/**
 * 曜日別集計 (全期間 or 部分期間)。
 * dailyBudget / actualDaily / lyDaily を曜日で集計する。
 *
 * @param rangeStart 集計開始日 (1-based, inclusive)。省略時は 1
 * @param rangeEnd 集計終了日 (1-based, inclusive)。省略時は daysInMonth
 * @calc-id CALC-019
 */
export function aggregateDowAverages(
  scenario: SimulatorScenario,
  rangeStart: number = 1,
  rangeEnd: number = scenario.daysInMonth,
): readonly DowAggregation[] {
  const { year, month, dailyBudget, actualDaily, lyDaily, daysInMonth } = scenario
  const start = Math.max(1, rangeStart)
  const end = Math.min(daysInMonth, rangeEnd)

  // 集計中は mutable に扱う。DowAggregation は readonly 定義だが、
  // ローカルで temporary object を作る。
  type Bucket = {
    dow: number
    label: string
    count: number
    budgetTotal: number
    actualTotal: number
    lyTotal: number
  }
  const buckets: Bucket[] = DOW_LABELS_JP.map((label, dow) => ({
    dow,
    label,
    count: 0,
    budgetTotal: 0,
    actualTotal: 0,
    lyTotal: 0,
  }))

  for (let day = start; day <= end; day++) {
    const dw = dowOf(year, month, day)
    const i = day - 1
    const row = buckets[dw]
    row.count += 1
    row.budgetTotal += dailyBudget[i] ?? 0
    row.actualTotal += actualDaily[i] ?? 0
    row.lyTotal += lyDaily[i] ?? 0
  }

  return buckets.map(
    (r): DowAggregation => ({
      ...r,
      budgetAvg: r.count > 0 ? r.budgetTotal / r.count : 0,
      actualAvg: r.count > 0 ? r.actualTotal / r.count : 0,
      lyAvg: r.count > 0 ? r.lyTotal / r.count : 0,
    }),
  )
}

/**
 * 週別集計 (weekStart で始まりの曜日を指定)。
 *
 * @param weekStart 0=日曜始まり, 1=月曜始まり
 * @param rangeStart 集計開始日 (1-based, inclusive)。省略時は 1
 * @param rangeEnd 集計終了日 (1-based, inclusive)。省略時は daysInMonth
 */
export function aggregateWeeks(
  scenario: SimulatorScenario,
  weekStart: 0 | 1,
  rangeStart: number = 1,
  rangeEnd: number = scenario.daysInMonth,
): readonly WeekAggregation[] {
  const { year, month, dailyBudget, actualDaily, lyDaily, daysInMonth } = scenario
  const start = Math.max(1, rangeStart)
  const end = Math.min(daysInMonth, rangeEnd)
  if (start > end) return []

  type Bucket = {
    weekIndex: number
    startDay: number
    endDay: number
    budgetTotal: number
    actualTotal: number
    lyTotal: number
  }

  const weeks: WeekAggregation[] = []
  let current: Bucket | null = null

  // 週境界: dowOf(day) === weekStart なら新しい週の開始
  for (let day = start; day <= end; day++) {
    const dw = dowOf(year, month, day)
    const i = day - 1

    if (current == null || (dw === weekStart && day !== start)) {
      if (current != null) weeks.push(finalizeWeek(current))
      current = {
        weekIndex: weeks.length,
        startDay: day,
        endDay: day,
        budgetTotal: 0,
        actualTotal: 0,
        lyTotal: 0,
      }
    }

    current.endDay = day
    current.budgetTotal += dailyBudget[i] ?? 0
    current.actualTotal += actualDaily[i] ?? 0
    current.lyTotal += lyDaily[i] ?? 0
  }

  if (current != null) weeks.push(finalizeWeek(current))
  return weeks
}

function finalizeWeek(w: {
  weekIndex: number
  startDay: number
  endDay: number
  budgetTotal: number
  actualTotal: number
  lyTotal: number
}): WeekAggregation {
  const achievement = w.budgetTotal > 0 ? (w.actualTotal / w.budgetTotal) * 100 : null
  return {
    weekIndex: w.weekIndex,
    startDay: w.startDay,
    endDay: w.endDay,
    budgetTotal: w.budgetTotal,
    actualTotal: w.actualTotal,
    lyTotal: w.lyTotal,
    achievement,
  }
}
