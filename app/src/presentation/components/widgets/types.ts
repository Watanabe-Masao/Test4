/**
 * ページ横断ウィジェットシステム — 型定義
 *
 * 全ページで全ウィジェットを利用可能にするための統一型。
 * UnifiedWidgetContext は全ウィジェットが必要とするデータの上位集合。
 * @responsibility R:unclassified
 */
import type { ReactNode } from 'react'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import type { StoreExplanations, MetricId, ObservationStatus } from '@/domain/models/analysis'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import type { Store } from '@/domain/models/record'
import type {
  StoreResult,
  StoreResultSlice,
  ViewType,
  AppSettings,
} from '@/domain/models/storeTypes'
import type { PeriodSelection } from '@/domain/models/PeriodSelection'
import type {
  PrevYearData,
  PrevYearDataSlice,
  PrevYearMonthlyKpi,
} from '@/application/hooks/analytics'
import type { DepartmentKpiIndex } from '@/domain/models/DepartmentKpiIndex'
import type { CurrencyFormatter } from '@/presentation/components/charts/chartTheme'
import type { WidgetDataOrchestratorResult } from '@/application/hooks/useWidgetDataOrchestrator'
import type { FreePeriodAnalysisFrame } from '@/domain/models/AnalysisFrame'
import type { FreePeriodAnalysisBundle } from '@/application/hooks/useFreePeriodAnalysisBundle'
import type {
  TimeSlotFrame,
  TimeSlotBundle,
} from '@/application/hooks/timeSlot/TimeSlotBundle.types'
import type {
  StoreDailyFrame,
  StoreDailyBundle,
} from '@/application/hooks/storeDaily/StoreDailyBundle.types'
import type {
  CategoryDailyFrame,
  CategoryDailyBundle,
} from '@/application/hooks/categoryDaily/CategoryDailyBundle.types'

export type WidgetSize = 'kpi' | 'half' | 'full'

/**
 * ページ識別子。各ページが独立したレイアウトを持つ。
 * カスタムページは `custom_${id}` 形式の文字列。
 */
export type BuiltinPageKey =
  | 'dashboard'
  | 'storeAnalysis'
  | 'daily'
  | 'insight'
  | 'category'
  | 'costDetail'
  | 'reports'
export type PageKey = BuiltinPageKey | `custom_${string}`

/**
 * 統一ウィジェットコンテキスト（transport 型）
 *
 * 全ページの全ウィジェットが参照しうるデータの上位集合。
 * `result` / `prevYear` は status 付き slice 型（discriminated union）であり、
 * 取得済みかどうかを型レベルで表現する。consumer は dispatch chokepoint で
 * `narrowRenderCtx()` により `RenderUnifiedWidgetContext` に narrow してから
 * widget 本体に渡す。widget 本体は narrow 後の `StoreResult` / `PrevYearData`
 * を直接参照する。
 *
 * ADR-A-004 PR3: `result: StoreResult` → `StoreResultSlice`、
 * `prevYear: PrevYearData` → `PrevYearDataSlice` へ変更。型と runtime 期待の
 * 乖離を解消し、consumer に narrowing を強制する。
 */
export interface UnifiedWidgetContext {
  // ── コア（全ページ必須） ──
  readonly result: StoreResultSlice
  readonly daysInMonth: number
  readonly targetRate: number
  readonly warningRate: number
  readonly year: number
  readonly month: number
  readonly settings: AppSettings
  readonly prevYear: PrevYearDataSlice
  readonly stores: ReadonlyMap<string, Store>
  readonly selectedStoreIds: ReadonlySet<string>
  readonly explanations: StoreExplanations
  readonly onExplain: (metricId: MetricId) => void
  /** 観測品質ステータス（result.observationPeriod.status から導出） */
  readonly observationStatus: ObservationStatus
  readonly departmentKpi: DepartmentKpiIndex
  /** 通貨単位設定に連動するフォーマッタ（千円/円切替対応） */
  readonly fmtCurrency: CurrencyFormatter

  // ── 期間選択（新モデル） ──
  /** 期間選択の全状態（periodSelectionStore から） */
  readonly periodSelection?: PeriodSelection

  // ── Dashboard / cross-page 共有 ──
  // ADR-A-002 PR4 audit (2026-04-24): 20 field を audit した結果、11 field が
  // 真に Dashboard 専用、9 field が cross-page (Insight / 他) で参照されていることを発見。
  //
  // 削除した 11 Dashboard 専用 field (DashboardWidgetContext で required 化済み):
  //   storeKey, dataEndDay, dataMaxDay, elapsedDays, monthlyHistory,
  //   loadedMonthCount, weatherPersist, dowGap, onPrevYearDetail,
  //   prevYearStoreCostPrice, currentCtsQuantity
  //
  // 残置した 9 cross-page field (Insight / Category / Reports などから ctx 経由で参照):
  //   allStoreResults, currentDateRange, prevYearScope, queryExecutor,
  //   duckDataVersion, prevYearMonthlyKpi, comparisonScope, weatherDaily,
  //   prevYearWeatherDaily
  //
  // unifiedWidgetContextNoDashboardSpecificGuard baseline 20→9 + ratchet-down 継続。
  readonly allStoreResults?: ReadonlyMap<string, StoreResult>
  readonly currentDateRange?: DateRange
  readonly prevYearScope?: PrevYearScope
  /** QueryExecutor — DuckDB クエリの標準経路 A */
  readonly queryExecutor?: QueryExecutor | null
  /** DuckDB データロード済みバージョン（useMemo 依存配列用、0 = 未ロード） */
  readonly duckDataVersion?: number
  readonly prevYearMonthlyKpi?: PrevYearMonthlyKpi
  readonly comparisonScope?: ComparisonScope | null
  /** 天気データ（日別サマリ） */
  readonly weatherDaily?: readonly import('@/domain/models/WeatherData').DailyWeatherSummary[]
  /** 前年天気データ（日別サマリ） */
  readonly prevYearWeatherDaily?: readonly import('@/domain/models/WeatherData').DailyWeatherSummary[]

  // ── 正本化 readModels（orchestrator 経由） ──
  /** 3正本（purchaseCost / salesFact / discountFact）の統合ビュー */
  readonly readModels?: WidgetDataOrchestratorResult

  // ── 自由期間分析レーン（unify-period-analysis Phase 1） ──
  /**
   * 自由期間分析レーンの統合ビュー。
   *
   * - `frame`: `buildFreePeriodFrame(PeriodSelection → FreePeriodAnalysisFrame)`
   *   の結果。入力契約。widget はこの frame を通して期間・店舗・比較条件を
   *   参照し、`usePeriodSelectionStore` を直接 import しない
   * - `bundle`: `useFreePeriodAnalysisBundle(executor, frame)` の結果。
   *   fact / budget / deptKPI の 3 readModel を束ねた取得ビュー
   *
   * 既存の `readModels`（orchestrator 経由）と並置されており、widget は
   * 段階的に本レーン経由へ移行する。将来的に Phase 6（段階的画面載せ替え）で
   * `readModels` と統合または置換する前提で、共通の 1 フィールドにネストして
   * 表現する（AR-003: shared hub の肥大化防止ルール対応）。
   */
  readonly freePeriodLane?: Readonly<{
    frame: FreePeriodAnalysisFrame | null
    bundle: FreePeriodAnalysisBundle
  }> | null

  /**
   * 時間帯比較レーン (unify-period-analysis Phase 6 Step C)。
   *
   * - `frame`: `TimeSlotFrame`。`(currentDateRange, selectedStoreIds, comparison)`
   *   を束ねた入力契約
   * - `bundle`: `useTimeSlotBundle(executor, frame)` の結果。
   *   `currentSeries / comparisonSeries` (`TimeSlotSeries`) と
   *   `meta.provenance` (mappingKind / comparisonRange) を持つ
   *
   * `freePeriodLane` の sibling として、時間帯次元を別レーンに切り出している
   * (`step-c-timeslot-lane-policy.md` 準拠)。presentation は `bundle.currentSeries`
   * のみを触り、raw 時間帯 row 型は import しない (`timeSlotLaneSurfaceGuard`
   * baseline 0 で固定済み)。
   */
  readonly timeSlotLane?: Readonly<{
    frame: TimeSlotFrame | null
    bundle: TimeSlotBundle
  }> | null

  /**
   * 店舗別日次レーン (unify-period-analysis Phase 6.5 Step B)。
   *
   * - `frame`: `StoreDailyFrame`。`(currentDateRange, selectedStoreIds, comparison)`
   *   を束ねた入力契約
   * - `bundle`: `useStoreDailyBundle(executor, frame)` の結果。
   *   `currentSeries / comparisonSeries` (`StoreDailySeries`) と
   *   `meta.provenance` (mappingKind / comparisonRange) を持つ
   *
   * `timeSlotLane` / `freePeriodLane` の sibling として、店舗別日次次元を
   * 別レーンに切り出している (`phase-6-5-step-b-design.md` 準拠)。
   * presentation は `bundle.currentSeries.entries[i].daily` のみを触り、
   * `StoreResult.daily` の直接 iterate は行わない (`storeDailyLaneSurfaceGuard`
   * で ratchet-down、Phase 6.5-5 で baseline 0 到達目標)。
   */
  readonly storeDailyLane?: Readonly<{
    frame: StoreDailyFrame | null
    bundle: StoreDailyBundle
  }> | null

  /**
   * 部門×日次レーン (unify-period-analysis Phase 6.5 Step B)。
   *
   * - `frame`: `CategoryDailyFrame`。`(currentDateRange, selectedStoreIds, comparison)`
   *   を束ねた入力契約
   * - `bundle`: `useCategoryDailyBundle(executor, frame)` の結果。
   *   `currentSeries / comparisonSeries` (`CategoryDailySeries`) と
   *   `meta.provenance` を持つ
   *
   * `timeSlotLane` / `freePeriodLane` / `storeDailyLane` の sibling として、
   * 部門×日次次元を別レーンに切り出している。presentation は
   * `bundle.currentSeries.entries[i].daily` のみを触り、raw CTS 型の
   * 直接 import は行わない
   * (`categoryDailyLaneSurfaceGuard` / `categoryLeafDailyLaneSurfaceGuard`
   * で baseline 0 到達済み)。
   */
  readonly categoryDailyLane?: Readonly<{
    frame: CategoryDailyFrame | null
    bundle: CategoryDailyBundle
  }> | null

  // ── 比較期間入力（ページレベル DualPeriodSlider から） ──
  /** ページレベルで統一された比較期間。DualPeriod 専用フィールド */
  readonly chartPeriodProps?: import('@/presentation/hooks/dualPeriod').ChartPeriodProps

  // ADR-A-001 PR4 (2026-04-24): 5 page-local optional field を剥離。
  // 各ページは page-specific context 型を使用すること:
  //   - Insight 固有 (insightData) → InsightWidgetContext
  //   - CostDetail 固有 (costDetailData) → CostDetailWidgetContext
  //   - Category 固有 (selectedResults / storeNames / onCustomCategoryChange) → CategoryWidgetContext
  // LEG-001〜LEG-003 の sunsetCondition 達成。
  // unifiedWidgetContextNoPageLocalOptionalGuard baseline 5→0 + fixed mode。
}

/**
 * 描画用 ウィジェットコンテキスト（dispatch chokepoint で narrow 済み）
 *
 * ADR-A-004 PR3: `UnifiedWidgetContext` の `result` / `prevYear` slice を
 * narrow したあとの型。widget 本体（`render` / `isVisible`）はこの型を受け取り、
 * 旧 shape と同様に `ctx.result.X` / `ctx.prevYear.X` を直接参照できる。
 *
 * narrow は dispatch site で `narrowRenderCtx()` により 1 回だけ行う。
 * widget 本体側に narrowing 文を散在させない（chokepoint パターン）。
 */
export interface RenderUnifiedWidgetContext extends Omit<
  UnifiedWidgetContext,
  'result' | 'prevYear'
> {
  readonly result: StoreResult
  readonly prevYear: PrevYearData
}

/**
 * ウィジェット定義（統一コンテキスト版）
 *
 * ADR-A-003 PR2-PR4 (2026-04-24): WidgetDef の 2 ファイル並存を解消するため
 * UnifiedWidgetDef に rename し、旧 alias を物理削除。LEG-005 sunsetCondition 達成。
 *
 * ADR-A-004 PR3: `render` / `isVisible` の signature を `RenderUnifiedWidgetContext`
 * （narrow 済み）に変更。dispatch site で narrow した値を渡す。
 */
export interface UnifiedWidgetDef {
  readonly id: string
  readonly label: string
  readonly group: string
  readonly size: WidgetSize
  readonly render: (ctx: RenderUnifiedWidgetContext) => ReactNode
  /** データ有無による表示判定（未設定時は常に表示） */
  readonly isVisible?: (ctx: RenderUnifiedWidgetContext) => boolean
  /** 関連ページへのリンク（「もっと詳しく」動線） */
  readonly linkTo?: { readonly view: ViewType; readonly tab?: string }
}

// ADR-A-003 PR4 (2026-04-24): WidgetDef alias を削除完了 (LEG-005 sunsetCondition 達成)。
// 全 consumer は UnifiedWidgetDef を直接 import すること。

/**
 * ページ単位のウィジェット設定
 */
export interface PageWidgetConfig {
  /** ページ識別子（localStorage のキーに使用） */
  readonly pageKey: PageKey
  /** このページで利用可能なウィジェット一覧（統一レジストリ） */
  readonly registry: readonly UnifiedWidgetDef[]
  /** デフォルトで表示するウィジェット ID */
  readonly defaultWidgetIds: readonly string[]
  /** ウィジェット設定パネルのタイトル */
  readonly settingsTitle: string
}
