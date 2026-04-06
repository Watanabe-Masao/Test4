/**
 * ガードテスト許可リスト — 責務分離（P2/P7/P12/P17/P18）
 *
 * 全エントリは active-debt。改修時に limit を下げるか削除する。
 */
import type { QuantitativeAllowlistEntry } from './types'

// ─── P2: presentation/ の getState() 直接アクセス ──────────────

export const presentationGetStateLimits: readonly QuantitativeAllowlistEntry[] = [
  {
    path: 'presentation/components/InventorySettingsSection.tsx',
    reason: '在庫設定の store 直接操作。getState 12 回',
    category: 'structural',
    removalCondition: 'callback props 経由に移行時',
    limit: 13,
    lifecycle: 'active-debt',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/StoreKpiTableInner.tsx',
    reason: 'KPI テーブルの store 直接アクセス。getState 5 回',
    category: 'structural',
    removalCondition: 'callback props 経由に移行時',
    limit: 6,
    lifecycle: 'active-debt',
  },
  {
    path: 'presentation/pages/Admin/AdminPage.tsx',
    reason: '管理画面の store アクセス。getState 2 回',
    category: 'structural',
    removalCondition: 'callback props 経由に移行時',
    limit: 3,
    lifecycle: 'active-debt',
  },
  {
    path: 'presentation/pages/Admin/PrevYearMappingTab.tsx',
    reason: '前年マッピングの store アクセス。getState 2 回',
    category: 'structural',
    removalCondition: 'callback props 経由に移行時',
    limit: 3,
    lifecycle: 'active-debt',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/ExecSummaryBarWidget.tsx',
    reason: 'サマリーバーの store アクセス。getState 2 回',
    category: 'structural',
    removalCondition: 'callback props 経由に移行時',
    limit: 3,
    lifecycle: 'active-debt',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/conditionSummaryUtils.ts',
    reason: '条件サマリーの store アクセス。getState 1 回',
    category: 'structural',
    removalCondition: 'callback props 経由に移行時',
    limit: 2,
    lifecycle: 'active-debt',
  },
  {
    path: 'presentation/pages/CostDetail/useCostDetailData.helpers.ts',
    reason: 'コスト明細ヘルパーの store アクセス。getState 1 回',
    category: 'structural',
    removalCondition: 'callback props 経由に移行時',
    limit: 2,
    lifecycle: 'active-debt',
  },
] as const

// ─── P7: module-scope let（グローバル変数） ──────────────────

export const moduleScopeLetLimits: readonly QuantitativeAllowlistEntry[] = [
  {
    path: 'application/services/wasmEngine.ts',
    reason: 'WASM エンジンのシングルトン管理。module let 6 個',
    category: 'structural',
    removalCondition: 'クラスまたは WeakRef ベースに移行時',
    limit: 7,
    lifecycle: 'permanent',
  },
  {
    path: 'application/workers/calculationWorker.ts',
    reason: 'Worker のシングルトン状態。module let 2 個',
    category: 'structural',
    removalCondition: 'Worker 再設計時',
    limit: 3,
    lifecycle: 'permanent',
  },
  {
    path: 'presentation/components/charts/EChart.tsx',
    reason: 'ECharts インスタンスキャッシュ。module let 2 個',
    category: 'structural',
    removalCondition: 'WeakMap ベースに移行時',
    limit: 3,
    lifecycle: 'active-debt',
  },
  {
    path: 'application/adapters/uiPersistenceAdapter.ts',
    reason: 'UI 永続化アダプタのキャッシュ。module let 1 個',
    category: 'structural',
    removalCondition: 'DI コンテナ導入時',
    limit: 2,
    lifecycle: 'permanent',
  },
  {
    path: 'application/lifecycle/swUpdateSignal.ts',
    reason: 'SW 更新シグナルのフラグ。module let 1 個',
    category: 'structural',
    removalCondition: 'SW 再設計時',
    limit: 2,
    lifecycle: 'permanent',
  },
  {
    path: 'application/hooks/useLoadComparisonData.ts',
    reason: '比較データの隣接月キャッシュ。module let 1 個',
    category: 'structural',
    removalCondition: 'WeakMap ベースに移行時',
    limit: 2,
    lifecycle: 'active-debt',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/widgetLayout.ts',
    reason: 'ウィジェットレイアウトの localStorage キャッシュ。module let 1 個',
    category: 'structural',
    removalCondition: 'application 層に移動時',
    limit: 2,
    lifecycle: 'active-debt',
  },
] as const

// ─── P12: domain/models/ の export 過多 ──────────────────────

export const domainModelExportLimits: readonly QuantitativeAllowlistEntry[] = [
  {
    path: 'domain/models/ClassifiedSales.ts',
    reason: '分類売上の型 + ビルダー群。export 10 個',
    category: 'structural',
    removalCondition: 'ビルダーを別ファイルに分離時',
    limit: 11,
    lifecycle: 'active-debt',
  },
  {
    path: 'domain/models/AsyncState.ts',
    reason: '非同期状態の型 + ヘルパー群。export 10 個',
    category: 'structural',
    removalCondition: 'ヘルパーを別ファイルに分離時',
    limit: 11,
    lifecycle: 'active-debt',
  },
  {
    path: 'domain/models/CalendarDate.ts',
    reason: '日付型 + 変換関数群。export 9 個',
    category: 'structural',
    removalCondition: '変換関数を別ファイルに分離時',
    limit: 10,
    lifecycle: 'active-debt',
  },
  {
    path: 'domain/models/DaySerial.ts',
    reason: '日シリアル型 + 変換関数群。export 8 個',
    category: 'structural',
    removalCondition: '変換関数を別ファイルに分離時',
    limit: 9,
    lifecycle: 'active-debt',
  },
] as const

// ─── P17: storeIds 正規化パターンの散在 ──────────────────────

/** 現在の散在ファイル数上限（これ以上コピーを増やさない） */
export const STORE_IDS_NORMALIZATION_MAX_FILES = 27

// ─── P18: fallback 定数密度（DUMMY_/EMPTY_/ZERO_/IDLE_ per file） ──

export const fallbackConstantDensityLimits: readonly QuantitativeAllowlistEntry[] = [
  {
    path: 'application/hooks/useDataSummary.ts',
    reason: 'データサマリーの初期値定義。fallback 17 個',
    category: 'structural',
    removalCondition: '初期値を共通モジュールに集約時',
    limit: 18,
    lifecycle: 'active-debt',
  },
  {
    path: 'application/usecases/calculation/dailyBuilder.ts',
    reason: '日次ビルダーの初期値定義。fallback 13 個',
    category: 'structural',
    removalCondition: '初期値を型のデフォルトに統合時',
    limit: 14,
    lifecycle: 'active-debt',
  },
  {
    path: 'presentation/pages/Daily/DailyPage.tsx',
    reason: '日次ページの空状態定義。fallback 13 個',
    category: 'structural',
    removalCondition: '空状態を共通モジュールに集約時',
    limit: 14,
    lifecycle: 'active-debt',
  },
  {
    path: 'features/comparison/application/hooks/useComparisonModule.ts',
    reason: '比較モジュールの初期値定義。fallback 11 個',
    category: 'structural',
    removalCondition: '初期値を型のデフォルトに統合時',
    limit: 12,
    lifecycle: 'active-debt',
  },
  {
    path: 'features/comparison/application/comparisonProjections.ts',
    reason: '比較投影の初期値定義。fallback 9 個',
    category: 'structural',
    removalCondition: '初期値を型のデフォルトに統合時',
    limit: 10,
    lifecycle: 'active-debt',
  },
  {
    path: 'application/usecases/calculation/summaryBuilder.ts',
    reason: 'サマリービルダーの初期値定義。fallback 9 個',
    category: 'structural',
    removalCondition: '初期値を型のデフォルトに統合時',
    limit: 10,
    lifecycle: 'active-debt',
  },
  {
    path: 'presentation/pages/Admin/RawDataTabBuilders.ts',
    reason: '生データタブの空状態定義。fallback 8 個',
    category: 'structural',
    removalCondition: '空状態を共通モジュールに集約時',
    limit: 9,
    lifecycle: 'active-debt',
  },
  {
    path: 'application/usecases/calculation/collectionAggregator.ts',
    reason: 'コレクション集約の初期値定義。fallback 7 個',
    category: 'structural',
    removalCondition: '初期値を型のデフォルトに統合時',
    limit: 8,
    lifecycle: 'active-debt',
  },
  {
    path: 'application/hooks/plans/useDayDetailPlan.ts',
    reason: '日次詳細 plan の初期値定義。fallback 7 個',
    category: 'structural',
    removalCondition: '初期値を型のデフォルトに統合時',
    limit: 8,
    lifecycle: 'active-debt',
  },
] as const
