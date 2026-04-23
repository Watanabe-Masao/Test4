/**
 * buildBudgetSimulatorScenario — source から SimulatorScenario を組み立てる pure builder
 *
 * reboot plan Phase E: hook / view / context を一切知らない純関数。
 *
 * 責務:
 *   - `BudgetSimulatorSource` (adapter 経由の raw data) から
 *     `SimulatorScenario` (domain 計算の入力契約) を構築する
 *   - alignment uncapped な前年日別値 (`prevYearMonthlyKpi.{sameDate|sameDow}.dailyMapping`)
 *     を優先的に採用する
 *   - 未取得 / legacy ケースは `PrevYearData` 経由で fallback する
 *
 * テストはこの pure function に対して書き、hook はこれを useMemo で wrap するだけ。
 *
 * @responsibility R:transform
 */
import type { SimulatorScenario } from '@/domain/calculations/budgetSimulator'
import { getPrevYearDailySales } from '@/application/comparison/comparisonAccessors'
import { selectMonthlyPrevYearSales } from '@/application/readModels/prevYear'
import type { BudgetSimulatorSource } from './buildBudgetSimulatorSource'

/**
 * source から full-month 前年日別売上 Map を抽出する。
 *
 * - `comparisonScope.alignmentMode` (sameDate / sameDayOfWeek) で entry を選択
 * - `prevYearMonthlyKpi.{sameDate|sameDow}.dailyMapping` は full-month 分を持つ
 *   (comparisonProjections.ts で elapsedDays なし scope から再構築されている)
 * - 未取得 / hasPrevYear=false なら null (caller 側で PrevYearData fallback)
 *
 * `monthlyTotal` は ConditionSummary と共有の `selectMonthlyPrevYearSales`
 * selector 経由で取得する (取り込み期間キャップなしの月全体値)。
 */
export function extractFullMonthLyDaily(source: BudgetSimulatorSource): {
  readonly daily: ReadonlyMap<number, number> | null
  readonly monthlyTotal: number | null
} {
  const { prevYearMonthlyKpi, comparisonScope } = source
  if (!prevYearMonthlyKpi || !prevYearMonthlyKpi.hasPrevYear) {
    return { daily: null, monthlyTotal: null }
  }
  const mode = comparisonScope?.alignmentMode ?? 'sameDate'
  const entry = mode === 'sameDayOfWeek' ? prevYearMonthlyKpi.sameDow : prevYearMonthlyKpi.sameDate
  const map = new Map<number, number>()
  for (const row of entry.dailyMapping) {
    map.set(row.currentDay, (map.get(row.currentDay) ?? 0) + row.prevSales)
  }
  const projection = selectMonthlyPrevYearSales(
    prevYearMonthlyKpi,
    mode === 'sameDayOfWeek' ? 'sameDow' : 'sameDate',
  )
  const monthlyTotal = projection.hasPrevYear ? projection.monthlySales : null
  return { daily: map.size > 0 ? map : null, monthlyTotal }
}

/**
 * `BudgetSimulatorSource` から `SimulatorScenario` を構築する。
 *
 * - dailyBudget: `result.budgetDaily`
 * - actualDaily: `result.daily.get(day)?.sales`
 * - lyDaily: prev-year full-month 優先 (`extractFullMonthLyDaily`)、
 *   未取得なら alignment-capped `getPrevYearDailySales`
 * - lyMonthly: 優先順位
 *   1. `monthlyTotal.sales` (alignment 非経由の前年月合計)
 *   2. `freePeriodCompTotalSales` (ConditionSummary 互換)
 *   3. lyDaily の合計 (legacy 経路)
 */
export function buildBudgetSimulatorScenario(source: BudgetSimulatorSource): SimulatorScenario {
  const { result, prevYear, year, month, freePeriodCompTotalSales } = source
  const daysInMonth = new Date(year, month, 0).getDate()

  const { daily: fullMonthLyDaily, monthlyTotal: fullMonthLyTotalFromKpi } =
    extractFullMonthLyDaily(source)

  const dailyBudget = new Array<number>(daysInMonth)
  const lyDaily = new Array<number>(daysInMonth)
  const actualDaily = new Array<number>(daysInMonth)

  const useFullMonthDaily = fullMonthLyDaily != null && fullMonthLyDaily.size > 0
  let lyDailySum = 0
  let lastLyNonZeroDay = 0
  for (let i = 0; i < daysInMonth; i++) {
    const day = i + 1
    dailyBudget[i] = result.budgetDaily.get(day) ?? 0
    const ly = useFullMonthDaily
      ? (fullMonthLyDaily!.get(day) ?? 0)
      : getPrevYearDailySales(prevYear, year, month, day)
    lyDaily[i] = ly
    lyDailySum += ly
    if (ly > 0) lastLyNonZeroDay = day
    actualDaily[i] = result.daily.get(day)?.sales ?? 0
  }

  const lyMonthly =
    fullMonthLyTotalFromKpi != null && fullMonthLyTotalFromKpi > 0
      ? fullMonthLyTotalFromKpi
      : freePeriodCompTotalSales != null && freePeriodCompTotalSales > 0
        ? freePeriodCompTotalSales
        : lyDailySum

  const lyCoverageDay: number | null = useFullMonthDaily
    ? null
    : lyMonthly > lyDailySum
      ? null
      : prevYear.hasPrevYear && lastLyNonZeroDay === daysInMonth
        ? null
        : lastLyNonZeroDay || null

  return {
    year,
    month,
    daysInMonth,
    monthlyBudget: result.budget,
    lyMonthly,
    dailyBudget,
    lyDaily,
    actualDaily,
    lyCoverageDay,
  }
}
