/**
 * ウィジェットレイアウト管理ユーティリティ
 *
 * ダッシュボードのレイアウト永続化・デフォルト構成・自動注入ロジック。
 * registry.tsx から分離した非コンポーネントエクスポート。
 */
import { WIDGET_REGISTRY } from './registry'
import type { WidgetDef } from './types'

export const WIDGET_MAP = new Map<string, WidgetDef>(WIDGET_REGISTRY.map((w) => [w.id, w]))

export const DEFAULT_WIDGET_IDS: string[] = [
  // 1. 今の状況は？
  'analysis-condition-summary',
  'analysis-alert-panel',
  // 2. 何が起きた？（トレンド視覚化）
  'chart-daily-sales',
  // 3. 数値で確認
  'exec-summary-bar',
  // 4. 予算や前年との比較は？
  'chart-budget-vs-actual',
  // 5. 詳細分析
  'exec-plan-actual-forecast',
  // 6. これからどうなる？
  'exec-forecast-tools',
  // 補助: 分析ツール
  'analysis-waterfall',
  'analysis-gp-heatmap',
  'chart-discount-breakdown',
  // 多角的分析
  'analysis-revenue-structure',
  'analysis-multi-kpi',
  // 補助: テーブル
  'exec-monthly-calendar',
  'exec-dow-average',
  'exec-weekly-summary',
]

const STORAGE_KEY = 'dashboard_layout_v11'

export function loadLayout(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_WIDGET_IDS
    const parsed = JSON.parse(raw) as string[]
    if (!Array.isArray(parsed)) return DEFAULT_WIDGET_IDS
    const valid = parsed.filter((id) => WIDGET_MAP.has(id))
    return valid.length > 0 ? valid : DEFAULT_WIDGET_IDS
  } catch {
    return DEFAULT_WIDGET_IDS
  }
}

export function saveLayout(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // ignore
  }
}

/**
 * データ駆動ウィジェットの自動注入
 *
 * isVisible が設定されたウィジェットのうち、
 * まだユーザーのレイアウトに含まれておらず、
 * 過去に注入→除外された記録がないものを自動追加する。
 */
const AUTO_INJECTED_KEY = 'dashboard_auto_injected_v2'

function getAutoInjectedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(AUTO_INJECTED_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function saveAutoInjectedIds(ids: Set<string>): void {
  try {
    localStorage.setItem(AUTO_INJECTED_KEY, JSON.stringify([...ids]))
  } catch {
    // ignore
  }
}

/**
 * データ有無に応じてウィジェットを自動注入する。
 * 初回のみ追加し、ユーザーが削除した場合は再注入しない。
 *
 * @returns 更新後の widgetIds（変更なしなら null）
 */
export function autoInjectDataWidgets(
  currentIds: string[],
  ctx: {
    ctsRecordCount: number
    prevYearHasPrevYear: boolean
    storeCount: number
    hasDiscountData?: boolean
  },
): string[] | null {
  const seen = getAutoInjectedIds()
  const candidates = WIDGET_REGISTRY.filter((w) => {
    if (!w.isVisible) return false
    // 既にレイアウトにある or 過去に注入済み → スキップ
    if (currentIds.includes(w.id) || seen.has(w.id)) return false
    // データチェック: isVisible は WidgetContext を要求するが、
    // ここでは必要な最小フィールドで簡易チェック
    if (w.id === 'analysis-yoy-waterfall' || w.id === 'analysis-yoy-variance') {
      return ctx.prevYearHasPrevYear
    }
    if (w.id === 'chart-store-timeslot-comparison') {
      return ctx.ctsRecordCount > 0 && ctx.storeCount > 1
    }
    if (w.id === 'chart-discount-breakdown') {
      return ctx.hasDiscountData === true
    }
    return ctx.ctsRecordCount > 0
  })

  if (candidates.length === 0) return null

  const newSeen = new Set(seen)
  for (const c of candidates) newSeen.add(c.id)
  saveAutoInjectedIds(newSeen)

  return [...currentIds, ...candidates.map((c) => c.id)]
}
