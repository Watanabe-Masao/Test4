/**
 * ページ横断ウィジェットレイアウト管理
 *
 * ページごとに独立した localStorage キーでレイアウトを永続化する。
 * 永続化は uiPersistenceAdapter 経由。
 * @responsibility R:utility
 */
import type { PageKey, UnifiedWidgetDef } from './types'
import { loadJson, saveJson, STORAGE_KEYS } from '@/application/adapters/uiPersistenceAdapter'

export function buildWidgetMap(registry: readonly UnifiedWidgetDef[]): ReadonlyMap<string, UnifiedWidgetDef> {
  return new Map(registry.map((w) => [w.id, w]))
}

export function loadPageLayout(
  pageKey: PageKey,
  registry: readonly UnifiedWidgetDef[],
  defaultIds: readonly string[],
): string[] {
  // dashboard は既存の localStorage キーを使い続ける（後方互換）
  if (pageKey === 'dashboard') {
    return loadLegacyDashboardLayout(defaultIds as string[])
  }
  const parsed = loadJson<string[]>(STORAGE_KEYS.widgetLayout(pageKey), [...defaultIds], (raw) =>
    Array.isArray(raw) ? (raw as string[]) : null,
  )
  const widgetMap = new Map(registry.map((w) => [w.id, w]))
  const valid = parsed.filter((id) => widgetMap.has(id))
  return valid.length > 0 ? valid : [...defaultIds]
}

export function savePageLayout(pageKey: PageKey, ids: string[]): void {
  if (pageKey === 'dashboard') {
    saveLegacyDashboardLayout(ids)
    return
  }
  saveJson(STORAGE_KEYS.widgetLayout(pageKey), ids)
}

// ── 既存 Dashboard との後方互換 ──────────────────────────

function loadLegacyDashboardLayout(defaultIds: string[]): string[] {
  return loadJson<string[]>(STORAGE_KEYS.DASHBOARD_LAYOUT, defaultIds, (raw) => {
    if (!Array.isArray(raw)) return null
    return (raw as string[]).length > 0 ? (raw as string[]) : null
  })
}

function saveLegacyDashboardLayout(ids: string[]): void {
  saveJson(STORAGE_KEYS.DASHBOARD_LAYOUT, ids)
}
