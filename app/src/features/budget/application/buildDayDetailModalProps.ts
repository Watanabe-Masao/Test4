/**
 * buildDayDetailModalProps — UnifiedWidgetContext + day から
 * `DayDetailModal` に必要な props を組み立てる adapter。
 *
 * reboot plan Phase 2 拡張: Dashboard の日別詳細モーダルを
 * Budget Simulator 配下の各カレンダー (①②③④) から開けるようにするための
 * 入口。Dashboard 側の `MonthlyCalendar` に閉じていたモーダル起動ロジックを
 * 汎用化する。
 *
 * 累計マップ (cumBudget / cumSales / cumPrevYear / cumCustomers /
 * cumPrevCustomers) は scenario から直接導出できるため、ここで計算する。
 * Dashboard 固有の `calendarUtils.buildCumulativeMaps` に依存しない。
 *
 * @responsibility R:transform
 */
import type { SimulatorScenario } from '@/domain/calculations/budgetSimulator'
import type { RenderUnifiedWidgetContext } from '@/presentation/components/widgets'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import type { DailyRecord } from '@/domain/models/record'
import type { PrevYearData } from '@/application/hooks/analytics'
import { getPrevYearDailyValue } from '@/application/comparison/comparisonAccessors'

// DayDetailModal の props 型を直接参照せず、必要なフィールドを明示する
// (cross-page import を避けるため)。onClose は呼出側で付与。
export interface DayDetailModalBaseProps {
  readonly day: number
  readonly month: number
  readonly year: number
  readonly record: DailyRecord | undefined
  readonly budget: number
  readonly cumBudget: number
  readonly cumSales: number
  readonly cumPrevYear: number
  readonly cumCustomers: number
  readonly cumPrevCustomers: number
  readonly prevYear: PrevYearData
  readonly queryExecutor: QueryExecutor | null
  readonly dataVersion: number
  readonly dailyMap: ReadonlyMap<number, DailyRecord>
  readonly selectedStoreIds: ReadonlySet<string> | undefined
  readonly comparisonScope: ComparisonScope | null
}

interface CumulativeAtDay {
  readonly cumBudget: number
  readonly cumSales: number
  readonly cumPrevYear: number
  readonly cumCustomers: number
  readonly cumPrevCustomers: number
}

/**
 * 1 日まで (inclusive) の累計値を scenario + prevYear から計算する。
 *
 * prevYear の customers は alignment 経由 (`getPrevYearDailyValue`) で取得する。
 */
export function computeCumulativeAtDay(
  scenario: SimulatorScenario,
  prevYear: PrevYearData,
  dailyMap: ReadonlyMap<number, DailyRecord>,
  targetDay: number,
): CumulativeAtDay {
  const { year, month, dailyBudget, lyDaily } = scenario
  let cumBudget = 0
  let cumSales = 0
  let cumPrevYear = 0
  let cumCustomers = 0
  let cumPrevCustomers = 0
  const end = Math.min(targetDay, scenario.daysInMonth)
  for (let d = 1; d <= end; d++) {
    cumBudget += dailyBudget[d - 1] ?? 0
    const rec = dailyMap.get(d)
    cumSales += rec?.sales ?? 0
    cumCustomers += rec?.customers ?? 0
    cumPrevYear += lyDaily[d - 1] ?? 0
    cumPrevCustomers += getPrevYearDailyValue(prevYear, year, month, d)?.customers ?? 0
  }
  return { cumBudget, cumSales, cumPrevYear, cumCustomers, cumPrevCustomers }
}

/**
 * `DayDetailModal` に渡す props を組み立てる。
 *
 * - 必須 ctx: `result` / `year` / `month` / `prevYear`
 * - optional: `queryExecutor` / `duckDataVersion` / `selectedStoreIds` / `comparisonScope`
 *   不足時は null / 空集合で埋める (モーダルはその旨を空状態として扱う)
 *
 * ADR-A-004 PR3: dispatch chokepoint で narrow 済の context を受け取る前提。
 *
 * @param ctx widget context (RenderUnifiedWidgetContext)
 * @param scenario 計算済み scenario (cum 値導出用)
 * @param day 選択日 (1-based)
 */
export function buildDayDetailModalProps(
  ctx: RenderUnifiedWidgetContext,
  scenario: SimulatorScenario,
  day: number,
): DayDetailModalBaseProps {
  const { year, month } = scenario
  const dailyMap = ctx.result.daily
  const cum = computeCumulativeAtDay(scenario, ctx.prevYear, dailyMap, day)
  return {
    day,
    month,
    year,
    record: dailyMap.get(day),
    budget: ctx.result.budgetDaily.get(day) ?? 0,
    cumBudget: cum.cumBudget,
    cumSales: cum.cumSales,
    cumPrevYear: cum.cumPrevYear,
    cumCustomers: cum.cumCustomers,
    cumPrevCustomers: cum.cumPrevCustomers,
    prevYear: ctx.prevYear,
    queryExecutor: ctx.queryExecutor ?? null,
    dataVersion: ctx.duckDataVersion ?? 0,
    dailyMap,
    selectedStoreIds: ctx.selectedStoreIds,
    comparisonScope: ctx.comparisonScope ?? null,
  }
}
