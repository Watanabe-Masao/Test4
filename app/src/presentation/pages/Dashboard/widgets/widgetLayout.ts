/**
 * ウィジェットレイアウト管理ユーティリティ
 *
 * ダッシュボードのレイアウト永続化・デフォルト構成。
 * マイグレーションは widgetMigration.ts、自動注入は widgetAutoInject.ts に分離。
 */
import { loadJson, saveJson } from '@/application/adapters/uiPersistenceAdapter'
import { WIDGET_REGISTRY } from './registry'
import type { WidgetDef } from './types'
import { migrateWidgetIds } from './widgetMigration'

// ── re-export（後方互換） ──
export { WIDGET_ID_MIGRATION, migrateWidgetIds } from './widgetMigration'
export { autoInjectDataWidgets } from './widgetAutoInject'

/** Lazy-initialized widget map (avoids TLA race with WIDGET_REGISTRY) */
const _widgetMapHolder: { cache: Map<string, WidgetDef> | null } = { cache: null }
export function getWidgetMap(): Map<string, WidgetDef> {
  if (!_widgetMapHolder.cache) {
    _widgetMapHolder.cache = new Map(WIDGET_REGISTRY.map((w) => [w.id, w]))
  }
  return _widgetMapHolder.cache
}

export const DEFAULT_WIDGET_IDS: string[] = [
  // 予算進捗ハブ（最上位: 予算達成 + 店別ドリルダウン + 予算ヘッダ）
  'widget-budget-achievement',
  // モニタリング
  'analysis-alert-panel',
  // 日別予算進捗（売上 vs 予算の累計推移）
  'chart-daily-sales',
  'insight-budget',
  // 着地予測
  'exec-forecast-tools',
]

const STORAGE_KEY = 'dashboard_layout_v14'

export function loadLayout(): string[] {
  const parsed = loadJson<string[] | null>(STORAGE_KEY, null, (raw) =>
    Array.isArray(raw) ? (raw as string[]) : null,
  )
  if (!parsed) return DEFAULT_WIDGET_IDS
  const migrated = migrateWidgetIds(parsed)
  const valid = migrated.filter((id) => getWidgetMap().has(id))
  return valid.length > 0 ? valid : DEFAULT_WIDGET_IDS
}

export function saveLayout(ids: string[]): void {
  saveJson(STORAGE_KEY, ids)
}
