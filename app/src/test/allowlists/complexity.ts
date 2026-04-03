/**
 * ガードテスト許可リスト — 複雑性（useMemo / useState / hook 行数）
 */
import type { QuantitativeAllowlistEntry } from './types'

/** useMemo 上限の個別例外 */
export const useMemoLimits: readonly QuantitativeAllowlistEntry[] = [
  {
    path: 'application/hooks/useComparisonModule.ts',
    reason: 'comparison 層の集約 hook。分割は過剰',
    category: 'structural',
    removalCondition: '比較モジュールのリファクタリング時',
    limit: 7,
    lifecycle: 'permanent',
  },
  // useTimeSlotData.ts — useTimeSlotPlan に query orchestration を分離。useMemo 3 個以下に削減
] as const

/** useState 上限の個別例外 */
export const useStateLimits: readonly QuantitativeAllowlistEntry[] = [
  {
    path: 'application/hooks/usePersistence.ts',
    reason: '永続化ステートの管理（usePersistenceState の正本共有分を含む）',
    category: 'structural',
    removalCondition: 'persistence hook のリファクタリング時',
    limit: 6,
    lifecycle: 'permanent',
  },
  {
    path: 'application/hooks/useAutoBackup.ts',
    reason: '自動バックアップのステート管理',
    category: 'structural',
    removalCondition: 'backup hook のリファクタリング時',
    limit: 7,
    lifecycle: 'permanent',
  },
  // useTimeSlotData.ts — useTimeSlotPlan に weather retry state を分離。useState 5 個に削減
  // ただし import 行で +1 カウントされ合計 6。default limit (6) と一致するため許可リスト維持
  {
    path: 'application/hooks/useTimeSlotData.ts',
    reason: 'UI state 5 個 + import 行カウント = 6。plan 分離後の最小構成',
    category: 'structural',
    removalCondition: 'guard が import 行を除外するようになったとき',
    limit: 7,
    lifecycle: 'permanent',
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
] as const

/** presentation/ の useState 上限の個別例外（G5 横展開） */
export const presentationStateLimits: readonly QuantitativeAllowlistEntry[] = [
  // useIntegratedSalesState.ts — useState 許可リスト削除済み（drill reducer 統合完了）
  // useMonthDataManagement.ts — features/storage-admin/ に移動完了。re-export 退役済み
  // useMonthlyCalendarState.ts — pinDialog 複合化 + ranges 複合化（10→6 useState）。許可リスト卒業
  // CategoryBenchmarkChart.vm.ts — useState 許可リスト削除済み（drill state 統合 + Logic 分離完了）
  // useDuckDBTimeSlotData.ts — バレル化完了（2026-03-23）: presentation 側の useState は 0 に
  {
    path: 'presentation/components/charts/periodFilterHooks.ts',
    reason: '期間フィルタの操作状態',
    category: 'structural',
    removalCondition: 'ロジック分離時',
    limit: 9,
    lifecycle: 'permanent',
  },
  // useDrilldownData.ts — sortState/segInteraction の複合化（9→7 useState）。許可リスト卒業
] as const

/** hook ファイル行数上限の個別例外 */
export const hookLineLimits: readonly QuantitativeAllowlistEntry[] = [
  // categoryBenchmarkLogic.ts: categoryBenchmarkByDate.ts に日別算出を分離。450→274行
  {
    path: 'application/hooks/duckdb/categoryBenchmarkLogic.ts',
    reason: 'DuckDB ベンチマーク計算ロジック（日別算出を分離済み）',
    category: 'structural',
    removalCondition: 'さらなる分割時',
    limit: 300,
    lifecycle: 'permanent',
  },
  // usePeriodAwareKpi.ts — 300行（デフォルト上限以下）。許可リスト卒業
  // useTimeSlotData.ts — useTimeSlotPlan に query orchestration を分離。133 行に削減
  // useTimeSlotPlan.ts: useTimeSlotWeatherPlan に天気サブプランを分離。320→240行
  {
    path: 'application/hooks/plans/useTimeSlotPlan.ts',
    reason:
      'TimeSlot query plan。8 useQueryWithHandler + WoW/YoY routing（天気は sub-plan に分離）',
    category: 'structural',
    removalCondition: 'さらなる sub-plan 分割時',
    limit: 260,
    lifecycle: 'permanent',
  },
] as const
