/**
 * ドリルダウン集計ユーティリティ
 *
 * DayDetailModal のカテゴリドリルダウン機能で使用する
 * 集計ロジック・型定義・定数を集約する。
 */
import type { CategoryTimeSalesRecord } from '@/domain/models'

/* ── 色パレット ──────────────────────────── */

export const COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899',
  '#8b5cf6', '#84cc16', '#f97316', '#14b8a6', '#e879f9', '#a3e635',
  '#fb923c', '#38bdf8', '#c084fc',
]

/* ── 千円表記ヘルパー ────────────────────── */

export function fmtSen(n: number): string {
  const sen = Math.round(n / 1_000)
  return `${sen.toLocaleString()}千`
}

/* ── 型定義 ──────────────────────────────── */

export interface DrillItem {
  code: string; name: string; amount: number; quantity: number; pct: number
  childCount: number; color: string
  prevAmount?: number; prevQuantity?: number
  yoyRatio?: number; yoyDiff?: number
  yoyQtyRatio?: number; yoyQtyDiff?: number
}

export type MetricKey = 'amount' | 'quantity'
export type CompareMode = 'daily' | 'cumulative'
export type SortKey = 'amount' | 'quantity' | 'pct' | 'name' | 'yoyRatio'
export type SortDir = 'asc' | 'desc'

export interface HourCategoryItem {
  dept: string; line: string; klass: string
  amount: number; quantity: number; pct: number; color: string
}

/* ── 集計関数 ─────────────────────────────── */

export function aggregateForDrill(
  records: readonly CategoryTimeSalesRecord[],
  level: 'department' | 'line' | 'klass',
) {
  const map = new Map<string, {
    code: string; name: string; amount: number; quantity: number
    children: Set<string>
  }>()
  for (const rec of records) {
    let key: string, name: string, childKey: string
    if (level === 'department') {
      key = rec.department.code; name = rec.department.name || key; childKey = rec.line.code
    } else if (level === 'line') {
      key = rec.line.code; name = rec.line.name || key; childKey = rec.klass.code
    } else {
      key = rec.klass.code; name = rec.klass.name || key; childKey = ''
    }
    const ex = map.get(key) ?? { code: key, name, amount: 0, quantity: 0, children: new Set() }
    ex.amount += rec.totalAmount; ex.quantity += rec.totalQuantity
    if (childKey) ex.children.add(childKey)
    map.set(key, ex)
  }
  return map
}

export function buildDrillItems(
  filtered: readonly CategoryTimeSalesRecord[],
  filteredPrev: readonly CategoryTimeSalesRecord[],
  level: 'department' | 'line' | 'klass',
  metric: MetricKey,
  colorMap: Map<string, string>,
  hasPrev: boolean,
): DrillItem[] {
  const map = aggregateForDrill(filtered, level)
  const prevMap = hasPrev ? aggregateForDrill(filteredPrev, level) : null
  const totalAmt = [...map.values()].reduce((s, v) => s + v.amount, 0)
  const totalQty = [...map.values()].reduce((s, v) => s + v.quantity, 0)
  const totalForPct = metric === 'amount' ? totalAmt : totalQty

  return [...map.values()]
    .sort((a, b) => b.amount - a.amount)
    .map((it, i): DrillItem => {
      const prev = prevMap?.get(it.code)
      const prevAmt = prev ? prev.amount : undefined
      const prevQty = prev ? prev.quantity : undefined
      const val = metric === 'amount' ? it.amount : it.quantity
      const color = colorMap.get(it.code) ?? COLORS[i % COLORS.length]
      return {
        code: it.code, name: it.name, amount: it.amount, quantity: it.quantity,
        pct: totalForPct > 0 ? (val / totalForPct) * 100 : 0,
        childCount: it.children.size, color,
        prevAmount: prevAmt, prevQuantity: prevQty,
        yoyRatio: prevAmt && prevAmt > 0 ? it.amount / prevAmt : undefined,
        yoyDiff: prevAmt != null ? it.amount - prevAmt : undefined,
        yoyQtyRatio: prevQty && prevQty > 0 ? it.quantity / prevQty : undefined,
        yoyQtyDiff: prevQty != null ? it.quantity - prevQty : undefined,
      }
    })
}
