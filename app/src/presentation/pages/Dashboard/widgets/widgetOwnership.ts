/**
 * Widget Ownership Registry — Dashboard widget の責務所属を定義
 *
 * 各 Dashboard widget がどの feature slice の責務かを明文化する。
 * structuralConventionGuard が未登録 widget を検出し、CI で強制する。
 *
 * ## ルール
 * - owner が feature 名の widget は、将来的にその feature 配下が正本になる
 * - shared は cross-cutting（複数 domain を横断）のため単一 feature に帰属しない
 * - shared にする場合は reason に根拠を記載
 * - 新規 widget 追加時は必ずここに登録する（guard で強制）
 *
 * @see features/README.md — ownership ルール
 * @see structuralConventionGuard.test.ts — 未登録 widget 検出 guard
 */

export type WidgetOwner =
  | 'sales'
  | 'budget'
  | 'forecast'
  | 'category'
  | 'purchase'
  | 'cost-detail'
  | 'reports'
  | 'shared'

export interface WidgetOwnershipEntry {
  readonly owner: WidgetOwner
  readonly reason: string
}

/**
 * 全 Dashboard widget の ownership マッピング。
 *
 * key = registry で定義される widget ID
 * value = owner feature + 分類理由
 */
export const WIDGET_OWNERSHIP = {
  // ─── KPI ──────────────────────────────────────────────
  'widget-budget-achievement': {
    owner: 'shared',
    reason: '予算達成+売上+前年比+値入率+売変率を横断表示するコンディションサマリー',
  },

  // ─── Chart ────────────────────────────────────────────
  'chart-daily-sales': {
    owner: 'sales',
    reason: '日別売上の主チャート（IntegratedSalesChart）',
  },
  'chart-gross-profit-amount': {
    owner: 'budget',
    reason: '粗利推移チャート',
  },
  'chart-timeslot-heatmap': {
    owner: 'sales',
    reason: '時間帯×曜日の売上ヒートマップ',
  },
  'chart-store-timeslot-comparison': {
    owner: 'sales',
    reason: '店舗別時間帯売上比較',
  },
  'chart-sales-purchase-comparison': {
    owner: 'purchase',
    reason: '売上・仕入の店舗比較チャート',
  },
  'chart-weather-correlation': {
    owner: 'shared',
    reason: '天気-売上相関は外部データ連携で単一 feature に帰属しない',
  },
  'chart-etrn-test': {
    owner: 'shared',
    reason: 'ETRN 取得テストは外部 API インフラ検証',
  },

  // ─── Analysis ─────────────────────────────────────────
  'analysis-waterfall': {
    owner: 'budget',
    reason: '粗利ウォーターフォール（要因分解）',
  },
  'analysis-gp-heatmap': {
    owner: 'budget',
    reason: '粗利率ヒートマップ',
  },
  'analysis-customer-scatter': {
    owner: 'sales',
    reason: '客数×客単価の効率分析',
  },
  'analysis-performance-index': {
    owner: 'shared',
    reason: 'PI値・偏差値・Zスコアは売上+客数+粗利を横断する汎用分析',
  },
  'analysis-category-pi': {
    owner: 'category',
    reason: 'カテゴリ別 PI 値・偏差値',
  },
  'analysis-causal-chain': {
    owner: 'shared',
    reason: '因果チェーン分析は売上+客数+客単価+粗利+売変を横断',
  },
  'analysis-sensitivity': {
    owner: 'shared',
    reason: '感度分析は全指標のシミュレーション',
  },
  'analysis-regression-insight': {
    owner: 'shared',
    reason: '回帰分析は汎用統計手法で単一 feature に帰属しない',
  },
  'analysis-seasonal-benchmark': {
    owner: 'forecast',
    reason: '季節性ベンチマークは需要予測の参照データ',
  },
  'analysis-duckdb-features': {
    owner: 'shared',
    reason: '売上トレンド分析は汎用 DuckDB 探索',
  },

  // ─── Exec ─────────────────────────────────────────────
  'analysis-alert-panel': {
    owner: 'shared',
    reason: 'アラートは全指標の閾値監視で横断的',
  },
  'exec-monthly-calendar': {
    owner: 'shared',
    reason: '月間カレンダーは日別売上+予算+前年を横断表示',
  },
  'exec-dow-average': {
    owner: 'sales',
    reason: '曜日平均は売上分析の基本ビュー',
  },
  'exec-weekly-summary': {
    owner: 'sales',
    reason: '週別サマリーは売上分析の基本ビュー',
  },
  'exec-daily-store-sales': {
    owner: 'sales',
    reason: '日別×店舗の売上・売変・客数テーブル',
  },
  'exec-daily-inventory': {
    owner: 'cost-detail',
    reason: '日別推定在庫は原価管理の派生指標',
  },
  'exec-store-kpi': {
    owner: 'shared',
    reason: '店舗別 KPI 一覧は売上+粗利+客数+予算を横断',
  },
  'exec-forecast-tools': {
    owner: 'forecast',
    reason: '着地予測・ゴールシークは需要予測機能',
  },

  // ─── DuckDB ───────────────────────────────────────────
  'duckdb-dow-pattern': {
    owner: 'sales',
    reason: '曜日パターン分析は売上の構造分析',
  },
  'duckdb-category-mix': {
    owner: 'category',
    reason: 'カテゴリ構成比推移',
  },
  'duckdb-category-benchmark': {
    owner: 'category',
    reason: 'カテゴリベンチマーク',
  },
  'duckdb-category-boxplot': {
    owner: 'category',
    reason: 'カテゴリ箱ひげ図',
  },
  'duckdb-cv-timeseries': {
    owner: 'shared',
    reason: 'CV 時系列分析は変動係数の汎用統計で単一 feature に帰属しない',
  },
} as const satisfies Readonly<Record<string, WidgetOwnershipEntry>>

/** Dashboard widget ID の union 型。WIDGET_OWNERSHIP から自動導出。 */
export type WidgetId = keyof typeof WIDGET_OWNERSHIP
