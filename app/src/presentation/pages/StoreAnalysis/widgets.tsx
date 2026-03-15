/**
 * StoreAnalysis ウィジェットレジストリ
 *
 * L1 店別分析ページ: ダッシュボードの「詳しく→」から遷移。
 * 店舗を選択して売上・粗利・構造指標を多角的に検証する。
 */

export const DEFAULT_STORE_ANALYSIS_WIDGET_IDS = [
  // 店舗別KPI一覧（全店比較）
  'exec-store-kpi',
  // 日別売上 vs 予算（累計推移）
  'chart-daily-sales',
  // 売上・仕入 店舗比較
  'chart-sales-purchase-comparison',
  // シャープリー要因分解
  'analysis-waterfall',
  // 粗利ヒートマップ
  'analysis-gp-heatmap',
  // 因果チェーン
  'analysis-causal-chain',
  // 日別在庫テーブル
  'exec-daily-inventory',
]
