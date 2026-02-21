/**
 * Phase 3.3: ダッシュボード レイアウトプリセット
 *
 * ユーザーの役割に応じた最適なウィジェット配置を提供する。
 */

export interface LayoutPreset {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly widgetIds: readonly string[]
}

/** 経営者向け: KPI重視、予実管理、全体把握 */
const EXECUTIVE_PRESET: LayoutPreset = {
  id: 'executive',
  label: '経営者向け',
  description: 'KPI・予実管理・全体把握を重視したレイアウト',
  widgetIds: [
    'analysis-condition-summary',
    'exec-summary-bar',
    'chart-budget-vs-actual',
    'exec-plan-actual-forecast',
    'chart-daily-sales',
    'kpi-inv-gross-profit',
    'kpi-est-margin',
    'kpi-core-sales',
    'kpi-discount-loss',
    'exec-store-kpi',
    'analysis-waterfall',
  ],
}

/** 現場担当者向け: 日常管理、日別詳細、仕入管理 */
const FIELD_PRESET: LayoutPreset = {
  id: 'field',
  label: '現場担当者向け',
  description: '日々の売上・仕入・在庫管理を重視したレイアウト',
  widgetIds: [
    'analysis-condition-summary',
    'chart-daily-sales',
    'exec-monthly-calendar',
    'kpi-inventory-cost',
    'kpi-consumable',
    'kpi-delivery-sales',
    'kpi-core-markup',
    'exec-dow-average',
    'exec-weekly-summary',
    'exec-daily-inventory',
    'chart-category-pie',
  ],
}

/** 分析者向け: チャート・トレンド・比較分析 */
const ANALYST_PRESET: LayoutPreset = {
  id: 'analyst',
  label: '分析者向け',
  description: 'データ分析・トレンド把握・比較を重視したレイアウト',
  widgetIds: [
    'analysis-condition-summary',
    'chart-daily-sales',
    'chart-budget-vs-actual',
    'chart-gross-profit-amount',
    'chart-category-pie',
    'chart-sales-purchase-comparison',
    'chart-category-hierarchy-explorer',
    'exec-forecast-tools',
    'analysis-waterfall',
    'analysis-gp-heatmap',
    'exec-daily-store-sales',
    'exec-department-kpi',
  ],
}

export const LAYOUT_PRESETS: readonly LayoutPreset[] = [
  EXECUTIVE_PRESET,
  FIELD_PRESET,
  ANALYST_PRESET,
]

export const PRESET_MAP = new Map(LAYOUT_PRESETS.map((p) => [p.id, p]))

const PRESET_STORAGE_KEY = 'dashboard_active_preset'

export function loadActivePreset(): string | null {
  try {
    return localStorage.getItem(PRESET_STORAGE_KEY)
  } catch {
    return null
  }
}

export function saveActivePreset(presetId: string | null): void {
  try {
    if (presetId) {
      localStorage.setItem(PRESET_STORAGE_KEY, presetId)
    } else {
      localStorage.removeItem(PRESET_STORAGE_KEY)
    }
  } catch {
    // ignore
  }
}
