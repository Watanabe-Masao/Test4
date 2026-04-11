/**
 * ガードテスト許可リスト — 責務分離（P2/P7/P12/P17/P18）
 *
 * 全エントリは active-debt。改修時に limit を下げるか削除する。
 */
import type { QuantitativeAllowlistEntry } from './types'

// ─── P2: presentation/ の getState() 直接アクセス ──────────────

export const presentationGetStateLimits: readonly QuantitativeAllowlistEntry[] = [
  // InventorySettingsSection.tsx — onInventoryUpdate callback props に移行。getState 0 回。許可リスト卒業
  // StoreKpiTableInner.tsx — Zustand selector 経由に移行。getState 0 回。許可リスト卒業
  // AdminPage.tsx — Zustand selector 経由に移行。getState 0 回。許可リスト卒業
  // PrevYearMappingTab.tsx — Zustand selector 経由に移行。getState 0 回。許可リスト卒業
  // ExecSummaryBarWidget.tsx — Zustand selector 経由に移行。getState 0 回。許可リスト卒業
  // conditionSummaryUtils.ts — userCategoryLabels を引数で受け取る pure function に変更。許可リスト卒業
  // useCostDetailData.helpers.ts — userCategoryLabels を引数で受け取る pure function に変更。許可リスト卒業
] as const

// ─── P7: module-scope let（グローバル変数） ──────────────────

export const moduleScopeLetLimits: readonly QuantitativeAllowlistEntry[] = [
  {
    path: 'application/services/wasmEngine.ts',
    ruleId: 'AR-RESP-MODULE-STATE',
    reason: 'WASM エンジンのシングルトン管理。module let 17 個（current 6 + candidate 11）',
    category: 'structural',
    removalCondition: 'クラスまたは WeakRef ベースに移行時',
    limit: 18,
    lifecycle: 'permanent',
    createdAt: '2026-04-08',
  },
  {
    path: 'application/workers/calculationWorker.ts',
    ruleId: 'AR-RESP-MODULE-STATE',
    reason: 'Worker のシングルトン状態。module let 2 個',
    category: 'structural',
    removalCondition: 'Worker 再設計時',
    limit: 3,
    lifecycle: 'permanent',
    createdAt: '2026-04-08',
  },
  // EChart.tsx — Set<string> ベースに移行。module let 0 個。許可リスト卒業
  {
    path: 'application/adapters/uiPersistenceAdapter.ts',
    ruleId: 'AR-RESP-MODULE-STATE',
    reason: 'UI 永続化アダプタのキャッシュ。module let 1 個',
    category: 'structural',
    removalCondition: 'DI コンテナ導入時',
    limit: 2,
    lifecycle: 'permanent',
    createdAt: '2026-04-08',
  },
  {
    path: 'application/lifecycle/swUpdateSignal.ts',
    ruleId: 'AR-RESP-MODULE-STATE',
    reason: 'SW 更新シグナルのフラグ。module let 1 個',
    category: 'structural',
    removalCondition: 'SW 再設計時',
    limit: 2,
    lifecycle: 'permanent',
    createdAt: '2026-04-08',
  },
  // ── Candidate bridge allowlist（factory 生成） ──
  // 全 candidate bridge は同一構造: module let 2 個（bridgeMode + lastDualRunResult）
  // Phase 8 Promote Ceremony 完了後に current bridge に統合して卒業
  ...(
    [
      'dowGapBridge',
      'piValueBridge',
      'remainingBudgetRateBridge',
      'trendAnalysisBridge',
      'movingAverageBridge',
      'correlationBridge',
      'sensitivityBridge',
      'inventoryCalcBridge',
      'pinIntervalsBridge',
      'observationPeriodBridge',
      'customerGapBridge',
    ] as const
  ).map(
    (name): QuantitativeAllowlistEntry => ({
      path: `application/services/${name}.ts`,
      ruleId: 'AR-RESP-MODULE-STATE',
      reason: 'Candidate bridge のモード管理 + dual-run 結果保持。module let 2 個',
      category: 'structural',
      removalCondition: 'Phase 8 Promote Ceremony 完了後、current bridge に統合時',
      limit: 3,
      lifecycle: 'active-debt',
      createdAt: '2026-04-10',
    }),
  ),
  // useLoadComparisonData.ts — const object ベースに移行。module let 0 個。許可リスト卒業
  // widgetLayout.ts — const object ベースに移行。module let 0 個。許可リスト卒業
] as const

// ─── P12: domain/models/ の export 過多 ──────────────────────

export const domainModelExportLimits: readonly QuantitativeAllowlistEntry[] = [
  // ClassifiedSales.ts — DiscountEntry.ts に分割。export 16→8。許可リスト卒業
  // AsyncState.ts — AsyncStateFactories.ts に分割。export 14→4。許可リスト卒業
  // CalendarDate.ts — DateRangeChunks.ts に分割。export 9→7。許可リスト卒業
  // DaySerial.ts — 未使用関数 2 件を削除。export 9→6。許可リスト卒業
] as const

// ─── P17: storeIds 正規化パターンの散在 ──────────────────────

/** 現在の散在ファイル数上限（これ以上コピーを増やさない） */
export const STORE_IDS_NORMALIZATION_MAX_FILES = 27

// ─── P18: fallback 定数密度（DUMMY_/EMPTY_/ZERO_/IDLE_ per file） ──

export const fallbackConstantDensityLimits: readonly QuantitativeAllowlistEntry[] = [
  // useDataSummary.ts — ローカル定数リネームで fallback 密度 17→0。許可リスト卒業
  // dailyBuilder.ts — エイリアス化で fallback 密度 13→6。許可リスト卒業
  // DailyPage.tsx — ローカル定数リネームで fallback 密度 13→0。許可リスト卒業
  // useComparisonModule.ts — ローカル定数リネーム + エイリアスで fallback 密度 11→2。許可リスト卒業
  // comparisonProjections.ts — ローカル定数リネームで fallback 密度 9→2。許可リスト卒業
  // summaryBuilder.ts — エイリアス化で fallback 密度 9→6。許可リスト卒業
  // RawDataTabBuilders.ts — ローカル定数リネームで fallback 密度 8→0。許可リスト卒業
  // collectionAggregator.ts — エイリアス化で fallback 密度 7→2。許可リスト卒業
  // useDayDetailPlan.ts — エイリアス化で fallback 密度 7→4。許可リスト卒業
] as const
