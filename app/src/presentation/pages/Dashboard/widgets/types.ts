import type { CurrentCtsQuantity } from '@/application/hooks/useCtsQuantity'
import type { ReactNode } from 'react'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import type { WeatherPersister } from '@/application/queries/weather'
import type { StoreExplanations, MetricId, ObservationStatus } from '@/domain/models/analysis'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import type { StoreResult, ViewType } from '@/domain/models/storeTypes'
import type { DailyWeatherSummary } from '@/domain/models/record'
import type { PrevYearMonthlyKpi } from '@/application/hooks/analytics'
import type { DowGapAnalysis } from '@/domain/models/ComparisonContext'
import type { DepartmentKpiIndex } from '@/domain/models/DepartmentKpiIndex'
import type { MonthlyDataPoint } from '@/application/hooks/useStatistics'
import type { CurrencyFormatter } from '@/presentation/components/charts/chartTheme'
import type { UnifiedWidgetContext } from '@/presentation/components/widgets/types'

export type WidgetSize = 'kpi' | 'half' | 'full'

/** 比較モード: 前年比 (yoy) / 前週比 (wow) */
export type ComparisonMode = 'yoy' | 'wow'

/** 前週比の比較期間を算出する。dayStart-7日 ～ dayEnd-7日。 */
export function wowPrevRange(
  dayStart: number,
  dayEnd: number,
): {
  prevStart: number
  prevEnd: number
  isValid: boolean
} {
  const prevStart = dayStart - 7
  const prevEnd = dayEnd - 7
  return { prevStart, prevEnd, isValid: prevStart >= 1 }
}

/** 比較モードに応じたラベルを返す */
export function comparisonLabels(
  mode: ComparisonMode,
  year: number,
  dayStart: number,
  dayEnd: number,
  prevYear?: number,
): { curLabel: string; prevLabel: string } {
  if (mode === 'yoy') {
    return { curLabel: `${year}年`, prevLabel: `${prevYear ?? year - 1}年` }
  }
  const { prevStart, prevEnd } = wowPrevRange(dayStart, dayEnd)
  const curRange = dayStart === dayEnd ? `${dayStart}日` : `${dayStart}-${dayEnd}日`
  const prevRange = prevStart === prevEnd ? `${prevStart}日` : `${prevStart}-${prevEnd}日`
  return { curLabel: curRange, prevLabel: prevRange }
}

export interface WidgetDef {
  readonly id: string
  readonly label: string
  readonly group: string
  readonly size: WidgetSize
  readonly render: (ctx: WidgetContext) => ReactNode
  /** データ有無による表示判定（未設定時は常に表示） */
  readonly isVisible?: (ctx: WidgetContext) => boolean
  /** 関連ページへのリンク（「もっと詳しく」動線） */
  readonly linkTo?: { readonly view: ViewType; readonly tab?: string }
}

/**
 * Dashboard ウィジェットコンテキスト
 *
 * UnifiedWidgetContext の Dashboard 向け具象化。
 * Dashboard が保証するフィールドを required に昇格し、
 * observationStatus を追加する。
 *
 * UnifiedWidgetContext との関係:
 * - コアフィールド（result, year, month 等）はそのまま継承
 * - optional だったフィールドを required にオーバーライド
 * - observationStatus は result.observationPeriod.status から導出
 */
export interface WidgetContext extends UnifiedWidgetContext {
  readonly storeKey: string
  readonly allStoreResults: ReadonlyMap<string, StoreResult>
  readonly currentDateRange: DateRange
  readonly prevYearScope: PrevYearScope | undefined
  readonly selectedStoreIds: ReadonlySet<string>
  readonly dataEndDay: number | null
  readonly dataMaxDay: number
  readonly elapsedDays: number | undefined
  readonly observationStatus: ObservationStatus
  readonly departmentKpi: DepartmentKpiIndex
  readonly explanations: StoreExplanations
  readonly onExplain: (metricId: MetricId) => void
  readonly monthlyHistory: readonly MonthlyDataPoint[]
  readonly queryExecutor: QueryExecutor
  readonly duckDataVersion: number
  readonly loadedMonthCount: number
  readonly weatherPersist: WeatherPersister | null
  readonly prevYearMonthlyKpi: PrevYearMonthlyKpi
  readonly comparisonScope: ComparisonScope | null
  readonly dowGap: DowGapAnalysis
  readonly onPrevYearDetail: (type: 'sameDow' | 'sameDate') => void
  readonly fmtCurrency: CurrencyFormatter
  readonly prevYearStoreCostPrice?: ReadonlyMap<string, { cost: number; price: number }>
  readonly weatherDaily?: readonly DailyWeatherSummary[]
  readonly prevYearWeatherDaily?: readonly DailyWeatherSummary[]
  readonly currentCtsQuantity: CurrentCtsQuantity
}

// re-export: CurrentCtsQuantity は Application 層で定義
export type { CurrentCtsQuantity }
