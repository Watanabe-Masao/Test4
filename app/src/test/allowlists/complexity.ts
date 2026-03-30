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
    limit: 8,
  },
  {
    path: 'application/hooks/useTimeSlotData.ts',
    reason: 'TimeSlot orchestrator。前年天気 ETRN fallback 追加により prevWeatherKeys memo が必要',
    category: 'structural',
    removalCondition: 'weather fallback を WeatherHourlyAvgHandler 内蔵に移行する時',
    limit: 8,
  },
] as const

/** useState 上限の個別例外 */
export const useStateLimits: readonly QuantitativeAllowlistEntry[] = [
  {
    path: 'application/hooks/usePersistence.ts',
    reason: '永続化ステートの管理（usePersistenceState の正本共有分を含む）',
    category: 'structural',
    removalCondition: 'persistence hook のリファクタリング時',
    limit: 8,
  },
  {
    path: 'application/hooks/useAutoBackup.ts',
    reason: '自動バックアップのステート管理',
    category: 'structural',
    removalCondition: 'backup hook のリファクタリング時',
    limit: 7,
  },
  {
    path: 'application/hooks/useTimeSlotData.ts',
    reason:
      'タイムスロット orchestrator。実質 state 7 個（cur/prev weather retry 含む）+ import 行でカウント +1',
    category: 'structural',
    removalCondition: 'weather fallback を WeatherHourlyAvgHandler 内蔵に移行する時',
    limit: 9,
  },
] as const

/** presentation/ の useMemo 上限の個別例外（G5 横展開） */
export const presentationMemoLimits: readonly QuantitativeAllowlistEntry[] = [
  {
    path: 'presentation/pages/CostDetail/useCostDetailData.ts',
    reason: '仕入詳細データの多段集計（helpers に 5 関数抽出済み）',
    category: 'structural',
    removalCondition: 'さらなるロジック分離時',
    limit: 13,
  },
  {
    path: 'presentation/pages/Dashboard/widgets/useDrilldownData.ts',
    reason: 'ドリルダウンの多段集計（logic に 3 関数抽出済み）',
    category: 'structural',
    removalCondition: 'さらなるロジック分離時',
    limit: 13,
  },
  {
    path: 'presentation/pages/Admin/RawDataTab.tsx',
    reason: '管理画面のデータ表示タブ。多数のフィルタ＋集計',
    category: 'structural',
    removalCondition: 'ロジック分離時',
    limit: 12,
  },
  {
    path: 'presentation/pages/Dashboard/widgets/YoYWaterfallChart.tsx',
    reason: '複合比較チャート。要因分解＋比較期間の二重集計',
    category: 'structural',
    removalCondition: 'ロジック分離時',
    limit: 11,
  },
  {
    path: 'presentation/pages/Dashboard/widgets/HourlyChart.tsx',
    reason: '時間帯別チャート。複数集計ビュー',
    category: 'structural',
    removalCondition: 'ロジック分離時',
    limit: 10,
  },
  // useDuckDBTimeSlotData.ts — バレル化完了（2026-03-23）: application/hooks/useTimeSlotData.ts へ移設
  {
    path: 'presentation/components/charts/DailySalesChartBody.tsx',
    reason: '日別売上チャート。複数シリーズ + MA overlay 構築',
    category: 'structural',
    removalCondition: 'builders 分離時',
    limit: 10,
  },
  // useIntegratedSalesState.ts — useMemo 許可リスト削除済み（drill reducer + context 分離完了）
  {
    path: 'presentation/pages/Dashboard/widgets/DrilldownWaterfall.tsx',
    reason: 'ウォーターフォール計算',
    category: 'structural',
    removalCondition: 'ロジック分離時',
    limit: 8,
  },
  {
    path: 'presentation/components/charts/TimeSlotChart.tsx',
    reason: 'タイムスロットチャートの集計',
    category: 'structural',
    removalCondition: 'ロジック分離時',
    limit: 8,
  },
] as const

/** presentation/ の useState 上限の個別例外（G5 横展開） */
export const presentationStateLimits: readonly QuantitativeAllowlistEntry[] = [
  // useIntegratedSalesState.ts — useState 許可リスト削除済み（drill reducer 統合完了）
  {
    path: 'presentation/pages/Admin/useMonthDataManagement.ts',
    reason: '月別データ管理の状態（StorageManagementTab から分離）',
    category: 'structural',
    removalCondition: 'useState 削減時',
    limit: 9,
  },
  {
    path: 'presentation/pages/Dashboard/widgets/useMonthlyCalendarState.ts',
    reason: 'カレンダー操作状態（ピン・範囲選択・hover 等）— MonthlyCalendar.tsx から hook に抽出',
    category: 'structural',
    removalCondition: 'useState 削減時（ピン状態と範囲状態の分離等）',
    limit: 11,
  },
  // CategoryBenchmarkChart.vm.ts — useState 許可リスト削除済み（drill state 統合 + Logic 分離完了）
  // useDuckDBTimeSlotData.ts — バレル化完了（2026-03-23）: presentation 側の useState は 0 に
  {
    path: 'presentation/components/charts/periodFilterHooks.ts',
    reason: '期間フィルタの操作状態',
    category: 'structural',
    removalCondition: 'ロジック分離時',
    limit: 9,
  },
  {
    path: 'presentation/pages/Dashboard/widgets/useDrilldownData.ts',
    reason: 'ドリルダウンの多段操作状態',
    category: 'structural',
    removalCondition: 'ロジック分離時',
    limit: 11,
  },
] as const

/** hook ファイル行数上限の個別例外 */
export const hookLineLimits: readonly QuantitativeAllowlistEntry[] = [
  {
    path: 'application/hooks/duckdb/categoryBenchmarkLogic.ts',
    reason: 'DuckDB ベンチマーク計算ロジック',
    category: 'structural',
    removalCondition: 'ロジック分割時',
    limit: 450,
  },
  {
    path: 'application/hooks/usePeriodAwareKpi.ts',
    reason: '期間対応 KPI hook',
    category: 'structural',
    removalCondition: 'KPI hook のリファクタリング時',
    limit: 310,
  },
  {
    path: 'application/hooks/useTimeSlotData.ts',
    reason:
      'TimeSlot orchestrator。10 useQueryWithHandler + cur/prev weather ETRN fallback + 12 useMemo input',
    category: 'structural',
    removalCondition: 'query input 構築を sub-hook に分離する時',
    limit: 390,
  },
] as const
