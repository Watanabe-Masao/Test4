/**
 * ページ横断ウィジェットシステム — 型定義
 *
 * 全ページで全ウィジェットを利用可能にするための統一型。
 * UnifiedWidgetContext は全ウィジェットが必要とするデータの上位集合。
 */
import type { ReactNode } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type {
  StoreResult,
  StoreExplanations,
  MetricId,
  DateRange,
  ViewType,
  ComparisonFrame,
  PrevYearScope,
  Store,
  AppSettings,
} from '@/domain/models'
import type { PrevYearData, PrevYearMonthlyKpi } from '@/application/hooks'
import type { DowGapAnalysis } from '@/domain/models/ComparisonContext'
import type { DepartmentKpiIndex } from '@/application/usecases/departmentKpi/indexBuilder'
import type { MonthlyDataPoint } from '@/application/hooks/useStatistics'
import type { InsightData } from '@/presentation/pages/Insight/useInsightData'
import type { CostDetailData } from '@/presentation/pages/CostDetail/useCostDetailData'

export type WidgetSize = 'kpi' | 'half' | 'full'

/**
 * ページ識別子。各ページが独立したレイアウトを持つ。
 * カスタムページは `custom_${id}` 形式の文字列。
 */
export type BuiltinPageKey =
  | 'dashboard'
  | 'daily'
  | 'insight'
  | 'category'
  | 'costDetail'
  | 'reports'
export type PageKey = BuiltinPageKey | `custom_${string}`

/**
 * 統一ウィジェットコンテキスト
 *
 * 全ページの全ウィジェットが参照しうるデータの上位集合。
 * ページによっては提供できないフィールドは optional。
 * ウィジェットの isVisible で利用可能性を判定する。
 */
export interface UnifiedWidgetContext {
  // ── コア（全ページ必須） ──
  readonly result: StoreResult
  readonly daysInMonth: number
  readonly targetRate: number
  readonly warningRate: number
  readonly year: number
  readonly month: number
  readonly settings: AppSettings
  readonly prevYear: PrevYearData
  readonly stores: ReadonlyMap<string, Store>
  readonly selectedStoreIds: ReadonlySet<string>
  readonly explanations: StoreExplanations
  readonly onExplain: (metricId: MetricId) => void
  readonly departmentKpi: DepartmentKpiIndex

  // ── Dashboard 固有（他ページではオプション） ──
  readonly storeKey?: string
  readonly allStoreResults?: ReadonlyMap<string, StoreResult>
  readonly currentDateRange?: DateRange
  readonly prevYearDateRange?: DateRange
  readonly prevYearScope?: PrevYearScope
  readonly dataEndDay?: number | null
  readonly dataMaxDay?: number
  readonly elapsedDays?: number | undefined
  readonly monthlyHistory?: readonly MonthlyDataPoint[]
  readonly duckConn?: AsyncDuckDBConnection | null
  readonly duckDataVersion?: number
  readonly duckLoadedMonthCount?: number
  readonly prevYearMonthlyKpi?: PrevYearMonthlyKpi
  readonly comparisonFrame?: ComparisonFrame
  readonly dowGap?: DowGapAnalysis
  readonly onPrevYearDetail?: (type: 'sameDow' | 'sameDate') => void

  // ── Insight 固有 ──
  readonly insightData?: InsightData

  // ── CostDetail 固有 ──
  readonly costDetailData?: CostDetailData

  // ── Category 固有 ──
  readonly selectedResults?: readonly StoreResult[]
  readonly storeNames?: ReadonlyMap<string, string>
  readonly onCustomCategoryChange?: (supplierCode: string, value: string) => void
}

/**
 * ウィジェット定義（統一コンテキスト版）
 */
export interface WidgetDef {
  readonly id: string
  readonly label: string
  readonly group: string
  readonly size: WidgetSize
  readonly render: (ctx: UnifiedWidgetContext) => ReactNode
  /** データ有無による表示判定（未設定時は常に表示） */
  readonly isVisible?: (ctx: UnifiedWidgetContext) => boolean
  /** 関連ページへのリンク（「もっと詳しく」動線） */
  readonly linkTo?: { readonly view: ViewType; readonly tab?: string }
}

/**
 * ページ単位のウィジェット設定
 */
export interface PageWidgetConfig {
  /** ページ識別子（localStorage のキーに使用） */
  readonly pageKey: PageKey
  /** このページで利用可能なウィジェット一覧（統一レジストリ） */
  readonly registry: readonly WidgetDef[]
  /** デフォルトで表示するウィジェット ID */
  readonly defaultWidgetIds: readonly string[]
  /** ウィジェット設定パネルのタイトル */
  readonly settingsTitle: string
}
