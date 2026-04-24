/**
 * Dashboard スタイル — バレルファイル
 *
 * 各グループの styled-components は個別ファイルに分割済み。
 * 後方互換のため、全エクスポートをここから re-export する。
 * 新規コードは個別ファイルから直接 import することを推奨。
 * @sunsetCondition 本 barrel は永続的構造（モジュール entry point / 後方互換 re-export）
 * @expiresAt 2099-12-31
 * @reason ADR-C-004 / F1 原則: モジュール entry の後方互換 barrel re-export
 */

// ─── Re-exports from split files ────────────────────────

export * from './SummaryTable.styles'
export * from './DashboardLayout.styles'
export * from './WidgetDragDrop.styles'
export * from './SettingsPanel.styles'
export * from './ExecSummary.styles'
// RangeComparison.styles: LEG-014 (ADR-C-003 PR2) で RangeComparison.tsx と共に削除。
// MonthlyCalendar widget 撤去 (Budget Simulator へ統合) に伴い削除。
// PinModalOverlay / Content / Title は components/day-detail/DayDetailModal.styles へ移設済み。
export * from './DayDetail.styles'
export * from './ForecastTools.styles'
