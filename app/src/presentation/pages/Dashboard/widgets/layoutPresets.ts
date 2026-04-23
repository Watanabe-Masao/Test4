/**
 * Phase 3.3: ダッシュボード レイアウトプリセット
 *
 * ユーザーの役割に応じた最適なウィジェット配置を提供する。
 * カスタムプリセットの保存・呼び出し機能を含む。
 */

export interface LayoutPreset {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly widgetIds: readonly string[]
  /** trueならユーザーが作成したカスタムプリセット */
  readonly isCustom?: boolean
}

/** 経営者向け: KPI重視、予実管理、全体把握 */
const EXECUTIVE_PRESET: LayoutPreset = {
  id: 'executive',
  label: '経営者向け',
  description: '予算進捗・収益概況・着地予測を重視したレイアウト',
  widgetIds: [
    'widget-budget-achievement',
    'analysis-condition-summary',
    'exec-plan-actual-forecast',
    'exec-forecast-tools',
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
    'widget-budget-achievement',
    'analysis-condition-summary',
    'chart-daily-sales',
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
    'widget-budget-achievement',
    'analysis-condition-summary',
    'chart-daily-sales',
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

/** 組み込みプリセット */
export const BUILTIN_PRESETS: readonly LayoutPreset[] = [
  EXECUTIVE_PRESET,
  FIELD_PRESET,
  ANALYST_PRESET,
]

export const PRESET_MAP = new Map(BUILTIN_PRESETS.map((p) => [p.id, p]))

import {
  loadRaw,
  saveRaw,
  removeKey,
  loadJson,
  saveJson,
  STORAGE_KEYS,
} from '@/application/adapters/uiPersistenceAdapter'

export function loadActivePreset(): string | null {
  return loadRaw(STORAGE_KEYS.DASHBOARD_ACTIVE_PRESET)
}

export function saveActivePreset(presetId: string | null): void {
  if (presetId) {
    saveRaw(STORAGE_KEYS.DASHBOARD_ACTIVE_PRESET, presetId)
  } else {
    removeKey(STORAGE_KEYS.DASHBOARD_ACTIVE_PRESET)
  }
}

// ─── カスタムプリセット管理 ─────────────────────────────

interface CustomPresetData {
  id: string
  label: string
  description: string
  widgetIds: string[]
}

export function loadCustomPresets(): LayoutPreset[] {
  return loadJson<CustomPresetData[]>(STORAGE_KEYS.DASHBOARD_CUSTOM_PRESETS, [], (raw) =>
    Array.isArray(raw) ? (raw as CustomPresetData[]) : null,
  ).map((p) => ({ ...p, isCustom: true }))
}

export function saveCustomPresets(presets: LayoutPreset[]): void {
  const data: CustomPresetData[] = presets.map((p) => ({
    id: p.id,
    label: p.label,
    description: p.description,
    widgetIds: [...p.widgetIds],
  }))
  saveJson(STORAGE_KEYS.DASHBOARD_CUSTOM_PRESETS, data)
}

export function addCustomPreset(
  label: string,
  description: string,
  widgetIds: string[],
): LayoutPreset {
  const presets = loadCustomPresets()
  const id = `custom-${Date.now()}`
  const newPreset: LayoutPreset = { id, label, description, widgetIds, isCustom: true }
  presets.push(newPreset)
  saveCustomPresets(presets)
  return newPreset
}

export function deleteCustomPreset(presetId: string): void {
  const presets = loadCustomPresets().filter((p) => p.id !== presetId)
  saveCustomPresets(presets)
}

/** 組み込み + カスタムのプリセット一覧を返す */
export function getAllPresets(): LayoutPreset[] {
  return [...BUILTIN_PRESETS, ...loadCustomPresets()]
}

/** 後方互換: LAYOUT_PRESETS は組み込みのみ */
export const LAYOUT_PRESETS = BUILTIN_PRESETS
