/**
 * ガードテスト許可リスト — 一元管理ファイル
 *
 * 全ガードテストの許可リストをメタデータ付きで集約する。
 * 各エントリには理由・カテゴリ・削除条件を記載し、
 * 「許可リストが不要になる構造」を目指す（CLAUDE.md §ガードテスト許可リスト参照）。
 */

// ─── 型定義 ───────────────────────────────────────────────

/** カテゴリ型の許可リストエントリ（ファイルパスの例外） */
export interface AllowlistEntry {
  readonly path: string
  readonly reason: string
  readonly category: 'adapter' | 'bridge' | 'lifecycle' | 'legacy' | 'structural' | 'migration'
  readonly removalCondition: string
}

/** 数量型の許可リストエントリ（ファイルごとの数値上限） */
export interface QuantitativeAllowlistEntry extends AllowlistEntry {
  readonly limit: number
}

// ─── ビルダー ─────────────────────────────────────────────

/** AllowlistEntry[] から path の Set を構築する */
export function buildAllowlistSet(entries: readonly AllowlistEntry[]): Set<string> {
  return new Set(entries.map((e) => e.path))
}

/** QuantitativeAllowlistEntry[] から path→limit の Record を構築する */
export function buildQuantitativeAllowlist(
  entries: readonly QuantitativeAllowlistEntry[],
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const e of entries) {
    result[e.path] = e.limit
  }
  return result
}

// ═══════════════════════════════════════════════════════════
// architectureGuard 系
// ═══════════════════════════════════════════════════════════

/** application/ → infrastructure/ の直接依存（adapter パターン） */
export const applicationToInfrastructure: readonly AllowlistEntry[] = [
  {
    path: 'application/hooks/useDuckDB.ts',
    reason: 'DuckDB 接続ライフサイクル管理',
    category: 'adapter',
    removalCondition: 'DuckDB adapter 層が確立されたとき',
  },
  {
    path: 'application/hooks/useRawDataFetch.ts',
    reason: 'ETRN データ取得の調停',
    category: 'adapter',
    removalCondition: 'データ取得が adapter 層に移行されたとき',
  },
  {
    path: 'application/hooks/useDataRecovery.ts',
    reason: 'IndexedDB リカバリ処理',
    category: 'lifecycle',
    removalCondition: 'リカバリが adapter 層に移行されたとき',
  },
  {
    path: 'application/hooks/useImport.ts',
    reason: 'ファイルインポート処理',
    category: 'adapter',
    removalCondition: 'インポートが adapter 層に完全移行されたとき',
  },
  {
    path: 'application/usecases/import/FileImportService.ts',
    reason: 'ファイルインポートサービス',
    category: 'adapter',
    removalCondition: 'インポートが adapter 層に完全移行されたとき',
  },
  {
    path: 'application/usecases/export/ExportService.ts',
    reason: 'エクスポートサービス',
    category: 'adapter',
    removalCondition: 'エクスポートが adapter 層に完全移行されたとき',
  },
  {
    path: 'application/hooks/useI18n.ts',
    reason: 'i18n インフラ初期化',
    category: 'adapter',
    removalCondition: 'i18n が adapter 層に移行されたとき',
  },
  {
    path: 'application/hooks/duckdb/useWeatherHourlyQuery.ts',
    reason: 'DuckDB 天気クエリ',
    category: 'bridge',
    removalCondition: 'QueryHandler パターンに移行されたとき',
  },
  {
    path: 'application/services/queryProfileService.ts',
    reason: 'DuckDB クエリプロファイリング',
    category: 'bridge',
    removalCondition: 'QueryHandler パターンに移行されたとき',
  },
  {
    path: 'application/adapters/weatherAdapter.ts',
    reason: 'adapter パターン — 正当な例外',
    category: 'adapter',
    removalCondition: '構造上不要にならない限り維持',
  },
  {
    path: 'application/adapters/storagePersistenceAdapter.ts',
    reason: 'adapter パターン — 正当な例外',
    category: 'adapter',
    removalCondition: '構造上不要にならない限り維持',
  },
  {
    path: 'application/adapters/backupAdapter.ts',
    reason: 'adapter パターン — 正当な例外',
    category: 'adapter',
    removalCondition: '構造上不要にならない限り維持',
  },
  {
    path: 'application/adapters/fileSystemAdapter.ts',
    reason: 'adapter パターン — 正当な例外',
    category: 'adapter',
    removalCondition: '構造上不要にならない限り維持',
  },
] as const

/** presentation/ → infrastructure/（Phase 3 で全件解消済み。凍結） */
export const presentationToInfrastructure: readonly AllowlistEntry[] = [] as const

/** infrastructure/ → application/（逆方向依存） */
export const infrastructureToApplication: readonly AllowlistEntry[] = [
  {
    path: 'infrastructure/storage/IndexedDBRawDataAdapter.ts',
    reason: 'RawDataAdapter が application の型を参照',
    category: 'bridge',
    removalCondition: 'domain/ に型を移動したとき',
  },
] as const

/** presentation/ から application/usecases/ 直接参照 */
export const presentationToUsecases: readonly AllowlistEntry[] = [
  {
    path: 'presentation/pages/Admin/ClearAllDataSection.tsx',
    reason: '管理画面の特殊操作',
    category: 'structural',
    removalCondition: 'Admin 操作が hook 経由に移行されたとき',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/MonthlyCalendar.tsx',
    reason: 'カレンダーウィジェットの直接参照',
    category: 'legacy',
    removalCondition: 'hook 経由に移行されたとき',
  },
] as const

/** presentation/ での DuckDB hook 直接使用（移行カウントダウン） */
export const presentationDuckdbHook: readonly AllowlistEntry[] = [
  {
    path: 'hooks/useUnifiedWidgetContext.ts',
    reason: 'ウィジェット統合コンテキスト',
    category: 'bridge',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/CategoryHierarchyExplorer.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/CategoryPerformanceChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/CategoryHourlyChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/DeptHourlyChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/DowPatternChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/FeatureChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/YoYChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'pages/Admin/StorageManagementTab.tsx',
    reason: 'DuckDB 管理',
    category: 'structural',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'pages/Dashboard/widgets/DayDetailModal.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'pages/Dashboard/widgets/MonthlyCalendar.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'pages/Dashboard/widgets/YoYWaterfallChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'pages/PurchaseAnalysis/PurchaseAnalysisPage.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/FactorDecompositionPanel.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/DiscountAnalysisPanel.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/WeatherAnalysisPanel.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/CategoryHeatmapPanel.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/HeatmapChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/CategoryBenchmarkChart.vm.ts',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/CategoryBoxPlotChart.vm.ts',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/CategoryMixChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/CategoryTrendChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/CumulativeChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/CvTimeSeriesChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/DeptTrendChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/PiCvBubbleChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/StoreHourlyChart.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'components/charts/useDuckDBTimeSlotData.ts',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'pages/Dashboard/widgets/ConditionMatrixTable.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
  {
    path: 'pages/Dashboard/widgets/ConditionSummaryBudgetDrill.tsx',
    reason: 'DuckDB 探索',
    category: 'migration',
    removalCondition: 'QueryHandler 移行',
  },
] as const

/** DOW 計算オーバーライド許可（全件解消済み。凍結） */
export const dowCalcOverride: readonly AllowlistEntry[] = [] as const

/** コンテキスト hook 許可 */
export const ctxHook: readonly AllowlistEntry[] = [
  {
    path: 'presentation/hooks/useUnifiedWidgetContext.ts',
    reason: 'ウィジェット統合コンテキスト',
    category: 'structural',
    removalCondition: 'コンテキスト設計見直し時',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/EtrnTestWidget.tsx',
    reason: 'ETRN テストウィジェット',
    category: 'legacy',
    removalCondition: 'テストウィジェット廃止時',
  },
] as const

// ═══════════════════════════════════════════════════════════
// hookComplexityGuard 系
// ═══════════════════════════════════════════════════════════

/** VM ファイルでの React import 許可 */
export const vmReactImport: readonly AllowlistEntry[] = [
  {
    path: 'presentation/components/charts/CategoryBenchmarkChart.vm.ts',
    reason: 'Recharts ResponsiveContainer 等が必要',
    category: 'structural',
    removalCondition: 'Recharts 依存が VM から分離されたとき',
  },
  {
    path: 'presentation/components/charts/CategoryBoxPlotChart.vm.ts',
    reason: 'Recharts ResponsiveContainer 等が必要',
    category: 'structural',
    removalCondition: 'Recharts 依存が VM から分離されたとき',
  },
] as const

/** domain/infrastructure での React import 除外ディレクトリ */
export const reactImportExcludeDirs: readonly AllowlistEntry[] = [
  {
    path: 'infrastructure/i18n',
    reason: 'React Context を使用するため除外',
    category: 'structural',
    removalCondition: 'i18n が React 非依存になったとき',
  },
] as const

/** useMemo 上限の個別例外 */
export const useMemoLimits: readonly QuantitativeAllowlistEntry[] = [
  {
    path: 'application/hooks/useComparisonModule.ts',
    reason: 'comparison 層の集約 hook。分割は過剰',
    category: 'structural',
    removalCondition: '比較モジュールのリファクタリング時',
    limit: 8,
  },
] as const

/** useState 上限の個別例外 */
export const useStateLimits: readonly QuantitativeAllowlistEntry[] = [
  {
    path: 'application/hooks/usePersistence.ts',
    reason: '永続化ステートの管理',
    category: 'structural',
    removalCondition: 'persistence hook のリファクタリング時',
    limit: 7,
  },
  {
    path: 'application/hooks/useAutoBackup.ts',
    reason: '自動バックアップのステート管理',
    category: 'structural',
    removalCondition: 'backup hook のリファクタリング時',
    limit: 7,
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
] as const

/** Presentation コンポーネント Tier 2（600行超の大規模コンポーネント） */
export const largeComponentTier2: readonly AllowlistEntry[] = [
  {
    path: 'presentation/components/charts/TimeSlotChart.tsx',
    reason: '時間帯チャート（660行）',
    category: 'legacy',
    removalCondition: '分割リファクタリング時',
  },
  {
    path: 'presentation/components/charts/BudgetVsActualChart.tsx',
    reason: '予実チャート（696行）',
    category: 'legacy',
    removalCondition: '分割リファクタリング時',
  },
  {
    path: 'presentation/components/charts/PerformanceIndexChart.tsx',
    reason: '指標チャート（610行）',
    category: 'legacy',
    removalCondition: '分割リファクタリング時',
  },
  {
    path: 'presentation/components/charts/YoYVarianceChart.tsx',
    reason: '前年差チャート（668行）',
    category: 'legacy',
    removalCondition: '分割リファクタリング時',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/CategoryFactorBreakdown.tsx',
    reason: 'カテゴリ要因分解（654行）',
    category: 'legacy',
    removalCondition: '分割リファクタリング時',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/DayDetailModal.tsx',
    reason: '日次詳細モーダル（689行）',
    category: 'legacy',
    removalCondition: '分割リファクタリング時',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/MonthlyCalendar.tsx',
    reason: '月間カレンダー（625行）',
    category: 'legacy',
    removalCondition: '分割リファクタリング時',
  },
  {
    path: 'presentation/pages/Forecast/ForecastChartsCustomer.tsx',
    reason: '予測チャート（756行）',
    category: 'legacy',
    removalCondition: '分割リファクタリング時',
  },
] as const

/** Infrastructure ファイルサイズ除外（400行超） */
export const infraLargeFiles: readonly AllowlistEntry[] = [
  {
    path: 'infrastructure/duckdb/dataConversions.ts',
    reason: 'DuckDB データ変換',
    category: 'structural',
    removalCondition: '分割時',
  },
  {
    path: 'infrastructure/duckdb/queries/purchaseComparison.ts',
    reason: '仕入比較クエリ',
    category: 'structural',
    removalCondition: '分割時',
  },
  {
    path: 'infrastructure/weather/jmaEtrnClient.ts',
    reason: 'JMA ETRN クライアント',
    category: 'structural',
    removalCondition: '分割時',
  },
] as const

/** Domain ファイルサイズ除外（300行超） */
export const domainLargeFiles: readonly AllowlistEntry[] = [
  {
    path: 'domain/constants/metricDefs.ts',
    reason: 'メトリック定義一覧',
    category: 'structural',
    removalCondition: '分割時',
  },
  {
    path: 'domain/constants/metricResolver.ts',
    reason: 'メトリック解決',
    category: 'structural',
    removalCondition: '分割時',
  },
  {
    path: 'domain/models/PeriodSelection.ts',
    reason: '期間選択モデル',
    category: 'structural',
    removalCondition: '分割時',
  },
  {
    path: 'domain/calculations/rawAggregation.ts',
    reason: 'Raw 集計',
    category: 'structural',
    removalCondition: '分割時',
  },
  {
    path: 'domain/models/ComparisonScope.ts',
    reason: '比較スコープモデル',
    category: 'structural',
    removalCondition: '分割時',
  },
  {
    path: 'domain/calculations/algorithms/advancedForecast.ts',
    reason: '高度予測アルゴリズム',
    category: 'structural',
    removalCondition: '分割時',
  },
  {
    path: 'domain/constants/formulaRegistryBusiness.ts',
    reason: '数式レジストリ',
    category: 'structural',
    removalCondition: '分割時',
  },
] as const

/** Application usecases ファイルサイズ除外（400行超） */
export const usecasesLargeFiles: readonly AllowlistEntry[] = [
  {
    path: 'application/usecases/import/importValidation.ts',
    reason: 'インポートバリデーション',
    category: 'structural',
    removalCondition: '分割時',
  },
  {
    path: 'application/usecases/clipExport/clipJs.ts',
    reason: 'クリップボードエクスポート',
    category: 'structural',
    removalCondition: '分割時',
  },
] as const

/** useEffect 副作用チェーン許可 */
export const sideEffectChain: readonly AllowlistEntry[] = [
  {
    path: 'application/hooks/useLoadComparisonData.ts',
    reason: '.then() 2行のみ — 分離は過剰',
    category: 'structural',
    removalCondition: '副作用チェーンが増えたとき',
  },
] as const

// ═══════════════════════════════════════════════════════════
// comparisonMigrationGuard 系
// ═══════════════════════════════════════════════════════════

/** INV-CMP-01: prevYear.daily.get(day) の既存違反（凍結） */
export const cmpPrevYearDaily: readonly AllowlistEntry[] = [
  {
    path: 'presentation/pages/Daily/DailyPage.tsx',
    reason: '旧 daily.get パターン',
    category: 'migration',
    removalCondition: 'V2 比較移行完了時',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/AlertPanel.tsx',
    reason: '旧 daily.get パターン',
    category: 'migration',
    removalCondition: 'V2 比較移行完了時',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/DayDetailModal.tsx',
    reason: '旧 daily.get パターン',
    category: 'migration',
    removalCondition: 'V2 比較移行完了時',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/DayDetailModal.vm.ts',
    reason: '旧 daily.get パターン',
    category: 'migration',
    removalCondition: 'V2 比較移行完了時',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/MonthlyCalendar.tsx',
    reason: '旧 daily.get パターン',
    category: 'migration',
    removalCondition: 'V2 比較移行完了時',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/calendarUtils.ts',
    reason: '旧 daily.get パターン',
    category: 'migration',
    removalCondition: 'V2 比較移行完了時',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/YoYWaterfallChart.tsx',
    reason: '旧 daily.get パターン',
    category: 'migration',
    removalCondition: 'V2 比較移行完了時',
  },
  {
    path: 'presentation/pages/Insight/InsightTabBudget.tsx',
    reason: '旧 daily.get パターン',
    category: 'migration',
    removalCondition: 'V2 比較移行完了時',
  },
  {
    path: 'presentation/pages/Forecast/ForecastPage.helpers.ts',
    reason: '旧 daily.get パターン',
    category: 'migration',
    removalCondition: 'V2 比較移行完了時',
  },
  {
    path: 'application/hooks/useBudgetChartData.ts',
    reason: '旧 daily.get パターン',
    category: 'migration',
    removalCondition: 'V2 比較移行完了時',
  },
  {
    path: 'application/usecases/clipExport/buildClipBundle.ts',
    reason: '旧 daily.get パターン',
    category: 'migration',
    removalCondition: 'V2 比較移行完了時',
  },
] as const

/** INV-CMP-03: comparisonFrame.previous の既存違反（凍結） */
export const cmpFramePrevious: readonly AllowlistEntry[] = [
  {
    path: 'presentation/pages/Dashboard/widgets/DayDetailModal.tsx',
    reason: '旧 previous パターン',
    category: 'migration',
    removalCondition: 'V2 比較移行完了時',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/YoYWaterfallChart.tsx',
    reason: '旧 previous パターン',
    category: 'migration',
    removalCondition: 'V2 比較移行完了時',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/MonthlyCalendar.tsx',
    reason: '旧 previous パターン',
    category: 'migration',
    removalCondition: 'V2 比較移行完了時',
  },
] as const

/** INV-CMP-08: dailyMapping の既存違反（凍結） */
export const cmpDailyMapping: readonly AllowlistEntry[] = [
  {
    path: 'presentation/pages/Dashboard/widgets/PrevYearBudgetDetailPanel.tsx',
    reason: 'sourceDate を落とさない正当な使用のため許可',
    category: 'structural',
    removalCondition: '比較サブシステム移行完了時',
  },
] as const
