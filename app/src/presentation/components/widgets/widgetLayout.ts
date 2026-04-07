/**
 * ページ横断ウィジェットレイアウト管理
 *
 * ページごとに独立した localStorage キーでレイアウトを永続化する。
 * @responsibility R:utility
 */
import type { PageKey, WidgetDef } from './types'

function storageKey(pageKey: PageKey): string {
  return `widget_layout_${pageKey}_v1`
}

export function buildWidgetMap(registry: readonly WidgetDef[]): ReadonlyMap<string, WidgetDef> {
  return new Map(registry.map((w) => [w.id, w]))
}

export function loadPageLayout(
  pageKey: PageKey,
  registry: readonly WidgetDef[],
  defaultIds: readonly string[],
): string[] {
  // dashboard は既存の localStorage キーを使い続ける（後方互換）
  if (pageKey === 'dashboard') {
    return loadLegacyDashboardLayout(defaultIds as string[])
  }
  try {
    const raw = localStorage.getItem(storageKey(pageKey))
    if (!raw) return [...defaultIds]
    const parsed = JSON.parse(raw) as string[]
    if (!Array.isArray(parsed)) return [...defaultIds]
    const widgetMap = new Map(registry.map((w) => [w.id, w]))
    const valid = parsed.filter((id) => widgetMap.has(id))
    return valid.length > 0 ? valid : [...defaultIds]
  } catch {
    return [...defaultIds]
  }
}

export function savePageLayout(pageKey: PageKey, ids: string[]): void {
  if (pageKey === 'dashboard') {
    saveLegacyDashboardLayout(ids)
    return
  }
  try {
    localStorage.setItem(storageKey(pageKey), JSON.stringify(ids))
  } catch {
    // ignore
  }
}

// ── 既存 Dashboard との後方互換 ──────────────────────────

const DASHBOARD_STORAGE_KEY = 'dashboard_layout_v12'

function loadLegacyDashboardLayout(defaultIds: string[]): string[] {
  try {
    const raw = localStorage.getItem(DASHBOARD_STORAGE_KEY)
    if (!raw) return defaultIds
    const parsed = JSON.parse(raw) as string[]
    if (!Array.isArray(parsed)) return defaultIds
    return parsed.length > 0 ? parsed : defaultIds
  } catch {
    return defaultIds
  }
}

function saveLegacyDashboardLayout(ids: string[]): void {
  try {
    localStorage.setItem(DASHBOARD_STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // ignore
  }
}
