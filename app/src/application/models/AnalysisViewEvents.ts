/**
 * AnalysisViewEvents — 派生ビューが親に返す標準イベント契約
 *
 * これは業務概念ではなく、分析 UI のインタラクション契約である。
 * Domain 層ではなく Application 層に配置する。
 *
 * 親コンテナ（IntegratedSalesChart 等）は AnalysisViewEvents の
 * コールバックを子ビューに渡し、子ビューはユーザー操作時にこれを呼ぶ。
 * 親はイベントを受けて CrossChartSelectionContext や自身の状態を更新する。
 */

// ── カテゴリフォーカス ───────────────────────────────────

/** カテゴリ階層のフォーカス対象 */
export interface CategoryFocus {
  readonly level: 'department' | 'line' | 'klass'
  readonly code: string
  readonly name: string
}

// ── イベント契約 ────────────────────────────────────────

/** 派生ビュー → 親コンテナへの標準イベント */
export interface AnalysisViewEvents {
  /** 日（日付範囲）の選択 */
  readonly onSelectDay?: (startDay: number, endDay?: number) => void
  /** 時間帯の選択 */
  readonly onSelectHour?: (hour: number) => void
  /** カテゴリの選択 */
  readonly onSelectCategory?: (focus: CategoryFocus) => void
  /** 選択解除 */
  readonly onClearSelection?: () => void
}
