/**
 * ガードテスト許可リスト — 複雑性（useMemo / useState / hook 行数）
 */
import type { QuantitativeAllowlistEntry } from './types'

/** useMemo 上限の個別例外 */
export const useMemoLimits: readonly QuantitativeAllowlistEntry[] = [
  {
    path: 'application/hooks/useComparisonModule.ts',
    ruleId: 'AR-G5-HOOK-MEMO',
    reason: 'comparison 層の集約 hook。分割は過剰',
    category: 'structural',
    removalCondition: '比較モジュールのリファクタリング時',
    limit: 7,
    lifecycle: 'permanent',
    createdAt: '2026-04-08',
    reviewPolicy: { owner: 'architecture', lastReviewedAt: '2026-04-24', reviewCadenceDays: 180 },
  },
  // useTimeSlotData.ts — useTimeSlotPlan に query orchestration を分離。useMemo 3 個以下に削減
] as const

/** useState 上限の個別例外 */
export const useStateLimits: readonly QuantitativeAllowlistEntry[] = [
  {
    path: 'application/hooks/usePersistence.ts',
    ruleId: 'AR-G5-HOOK-STATE',
    reason: '永続化ステートの管理（usePersistenceState の正本共有分を含む）',
    category: 'structural',
    removalCondition: 'persistence hook のリファクタリング時',
    limit: 6,
    lifecycle: 'permanent',
    createdAt: '2026-04-08',
    reviewPolicy: { owner: 'architecture', lastReviewedAt: '2026-04-24', reviewCadenceDays: 180 },
  },
  {
    path: 'application/hooks/useAutoBackup.ts',
    ruleId: 'AR-G5-HOOK-STATE',
    reason: '自動バックアップのステート管理',
    category: 'structural',
    removalCondition: 'backup hook のリファクタリング時',
    limit: 7,
    lifecycle: 'permanent',
    createdAt: '2026-04-08',
    reviewPolicy: { owner: 'architecture', lastReviewedAt: '2026-04-24', reviewCadenceDays: 180 },
  },
  // useTimeSlotData.ts — useTimeSlotPlan に weather retry state を分離。useState 5 個に削減
  // ただし import 行で +1 カウントされ合計 6。default limit (6) と一致するため許可リスト維持
  {
    path: 'application/hooks/useTimeSlotData.ts',
    ruleId: 'AR-G5-HOOK-STATE',
    reason: 'UI state 5 個 + import 行カウント = 6。plan 分離後の最小構成',
    category: 'structural',
    removalCondition: 'guard が import 行を除外するようになったとき',
    limit: 7,
    lifecycle: 'permanent',
    createdAt: '2026-04-08',
    reviewPolicy: { owner: 'architecture', lastReviewedAt: '2026-04-24', reviewCadenceDays: 180 },
  },
] as const

/** presentation/ の useMemo 上限の個別例外（G5 横展開） */
export const presentationMemoLimits: readonly QuantitativeAllowlistEntry[] = [
  // useCostDetailData.ts — useCostDetailTransfer + useCostDetailCostInclusion に分離。useMemo 2 個に削減
  // useDrilldownRecords.ts — builder 分離完了（10→3 useMemo）。許可リスト卒業
  // useDrilldownData.ts — useDrilldownRecords に 10 useMemo を分離。useMemo 2 個に削減
  // RawDataTab.tsx — buildAllIndices 統合（12→4 useMemo）。許可リスト卒業
  // YoYWaterfallChart.tsx — buildDateRanges + buildPeriodAggregates 統合（11→6 useMemo）。許可リスト卒業
  // HourlyChart.tsx — buildHourlyDataSets + buildPaddedDataSets + buildSelectedDetail 統合（9→5 useMemo）。許可リスト卒業
  // useDuckDBTimeSlotData.ts — バレル化完了（2026-03-23）: application/hooks/useTimeSlotData.ts へ移設
  // DailySalesChartBody.tsx — buildWeatherContext 統合（8→6 useMemo）。許可リスト卒業
  // useIntegratedSalesState.ts — useMemo 許可リスト削除済み（drill reducer + context 分離完了）
  // DrilldownWaterfall.tsx — buildRecordAggregates 統合（7→5 useMemo）。許可リスト卒業
  // TimeSlotChart.tsx — module constants + weather/hours 一括構築（8→3 useMemo）。許可リスト卒業
  // WeatherPage.tsx — G8-P8 合計 allowlist で管理。個別 useMemo 許可リスト卒業
] as const

/** presentation/ の useState 上限の個別例外（G5 横展開） */
export const presentationStateLimits: readonly QuantitativeAllowlistEntry[] = [
  // useIntegratedSalesState.ts — useState 許可リスト削除済み（drill reducer 統合完了）
  // useMonthDataManagement.ts — features/storage-admin/ に移動完了。re-export 退役済み
  // useMonthlyCalendarState.ts — pinDialog 複合化 + ranges 複合化（10→6 useState）。許可リスト卒業
  // CategoryBenchmarkChart.vm.ts — useState 許可リスト削除済み（drill state 統合 + Logic 分離完了）
  // useDuckDBTimeSlotData.ts — バレル化完了（2026-03-23）: presentation 側の useState は 0 に
  // periodFilterHooks.ts — useHierarchyDropdown 分離で useState 9→5。許可リスト卒業
  // useDrilldownData.ts — sortState/segInteraction の複合化（9→7 useState）。許可リスト卒業
] as const

/** useMemo+useCallback 合計上限の個別例外（責務分離 P8 ガード） */
export const combinedHookComplexityLimits: readonly QuantitativeAllowlistEntry[] = [
  // WeatherPage.tsx — useWeatherDaySelection 抽出で combined 17→13。許可リスト卒業
  // useMonthlyCalendarState.ts — thin wrapper useCallback 6件を plain function 化。combined 13→7。許可リスト卒業
  // useCostDetailData.ts — flows+items useMemo 統合で combined 12→9。許可リスト卒業
] as const

/** features/ の useMemo 上限の個別例外（責務分離カバレッジ拡大） */
export const featuresMemoLimits: readonly QuantitativeAllowlistEntry[] = [
  // useCostDetailData.ts — useMemo 9→2。transfer/costInclusion を sub-hook に分離。許可リスト卒業
  // useComparisonModule.ts — Phase O5 で core/wrapper 分離。useComparisonModule.ts は useMemo 0、useComparisonModuleCore.ts は useMemo 6 (default limit 7 以下)。許可リスト卒業
] as const

/** features/ の useState 上限の個別例外（責務分離カバレッジ拡大） */
export const featuresStateLimits: readonly QuantitativeAllowlistEntry[] = [
  // useMonthDataManagement.ts — deleteTarget+deleting を 1 state に統合。useState 5→4。許可リスト卒業
  // StorageDataViewers.tsx — async state 統合で useState 6→2。許可リスト卒業
  // CategoryBenchmarkChart.vm.ts — guard の import 行除外で useState 6→5 (< 6)。許可リスト卒業
  // CategoryBoxPlotChart.vm.ts — drill hierarchy 統合で useState 6→4。許可リスト卒業
  // useCostDetailData.ts (useState) — guard の import 行除外で useState 6→5 (< 6)。許可リスト卒業
] as const

/** hook ファイル行数上限の個別例外 */
export const hookLineLimits: readonly QuantitativeAllowlistEntry[] = [
  // categoryBenchmarkLogic.ts: categoryBenchmarkByDate.ts に日別算出を分離。450→274行
  {
    path: 'application/hooks/duckdb/categoryBenchmarkLogic.ts',
    ruleId: 'AR-G5-HOOK-LINES',
    reason: 'DuckDB ベンチマーク計算ロジック（日別算出を分離済み）',
    category: 'structural',
    removalCondition: 'さらなる分割時',
    limit: 300,
    lifecycle: 'permanent',
    createdAt: '2026-04-08',
    reviewPolicy: { owner: 'architecture', lastReviewedAt: '2026-04-24', reviewCadenceDays: 180 },
  },
  // usePeriodAwareKpi.ts — 300行（デフォルト上限以下）。許可リスト卒業
  // useTimeSlotData.ts — useTimeSlotPlan に query orchestration を分離。133 行に削減
  // useTimeSlotPlan.ts: hierarchy + weather sub-plan 分離で 206 行。デフォルト上限 300 行以下。許可リスト卒業
  // purchaseComparisonCategory.ts — groupCategoryRows を purchaseComparisonKpi.ts に分離。303→286 行。許可リスト卒業
] as const
