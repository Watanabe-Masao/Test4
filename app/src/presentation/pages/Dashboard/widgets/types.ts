import type { ReactNode } from 'react'
import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { StoreExplanations, MetricId, ObservationStatus } from '@/domain/models/analysis'
import type { DateRange, ComparisonFrame, PrevYearScope } from '@/domain/models/calendar'
import type { StoreResult, ViewType } from '@/domain/models/storeTypes'
import type { Store, DailyWeatherSummary } from '@/domain/models/record'
import type { PrevYearData, PrevYearMonthlyKpi } from '@/application/hooks/analytics'
import type { DowGapAnalysis } from '@/domain/models/ComparisonContext'
import type { DepartmentKpiIndex } from '@/domain/models/DepartmentKpiIndex'
import type { MonthlyDataPoint } from '@/application/hooks/useStatistics'
import type { CurrencyFormatter } from '@/presentation/components/charts/chartTheme'

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

export interface WidgetContext {
  result: StoreResult
  daysInMonth: number
  targetRate: number
  warningRate: number
  year: number
  month: number
  storeKey: string
  prevYear: PrevYearData
  /** All individual store results for multi-store widgets */
  allStoreResults: ReadonlyMap<string, StoreResult>
  /** Store master data */
  stores: ReadonlyMap<string, Store>
  /**
   * 当月データの日付範囲。チャート用フックの dateRange パラメータに渡す。
   * 例: { from: { year: 2026, month: 2, day: 1 }, to: { year: 2026, month: 2, day: 28 } }
   */
  currentDateRange: DateRange
  /**
   * 前年データの日付範囲（前年データがない場合は undefined）。
   * チャート用フックの compareRange パラメータに渡す。
   */
  prevYearDateRange?: DateRange
  /** 前年比較スコープ（DOW offset 調整済み日付範囲 + 同スコープの客数） */
  prevYearScope?: PrevYearScope
  /** 選択中の店舗ID（空 = 全店） */
  selectedStoreIds: ReadonlySet<string>
  /** 取込データ有効末日 (null = 月末) */
  dataEndDay: number | null
  /** 販売データが存在する最大日（0 = 未検出） */
  dataMaxDay: number
  /** 取込データ有効期間から算出された経過日数 */
  elapsedDays: number | undefined
  /** 観測品質ステータス（observationPeriod.status の便利アクセサ） */
  observationStatus: ObservationStatus
  /** 部門別KPIインデックス（buildDepartmentKpiIndex経由） */
  departmentKpi: DepartmentKpiIndex
  /** 指標説明マップ（MetricBreakdownPanel 用） */
  explanations: StoreExplanations
  /** 指標の説明パネルを開く */
  onExplain: (metricId: MetricId) => void
  /** 過去月データ（季節性分析用） */
  monthlyHistory: readonly MonthlyDataPoint[]
  /** DuckDB コネクション（DuckDB 準備完了時のみ非 null） */
  duckConn: AsyncDuckDBConnection | null
  /** DuckDB インスタンス（バルクINSERT用、DuckDB 準備完了時のみ非 null） */
  duckDb: AsyncDuckDB | null
  /** DuckDB データロード済みバージョン（useMemo 依存配列用、0 = 未ロード） */
  duckDataVersion: number
  /** DuckDB にロード済みの月数（当月含む。マルチ月機能の利用可否判定に使用） */
  duckLoadedMonthCount: number
  /** 前年月間KPI（同曜日/同日、dataEndDay非依存） */
  prevYearMonthlyKpi: PrevYearMonthlyKpi
  /** 比較フレーム（全チャート共通の前年期間決定） */
  comparisonFrame: ComparisonFrame
  /** 曜日ギャップ分析結果 */
  dowGap: DowGapAnalysis
  /** 前年予算比較詳細パネルを開く */
  onPrevYearDetail: (type: 'sameDow' | 'sameDate') => void
  /** 通貨単位設定に連動するフォーマッタ（千円/円切替対応） */
  fmtCurrency: CurrencyFormatter
  /** 前年店舗別仕入額（DuckDB UNION query 結果）。率ではなく額で持つ（禁止事項 #10） */
  prevYearStoreCostPrice?: ReadonlyMap<string, { cost: number; price: number }>
  /** 天気データ（日別サマリ） */
  weatherDaily?: readonly DailyWeatherSummary[]
}
