/**
 * コンディションサマリー強化版 — フォーマッター + シグナルカラー
 *
 * @guard F7 View は ViewModel のみ受け取る
 *
 * @responsibility R:unclassified
 */

// ─── Signal Colors ──────────────────────────────────────

export function achievementColor(val: number): string {
  if (val >= 100) return '#10b981'
  if (val >= 97) return '#eab308'
  return '#ef4444'
}

export function rateDiffColor(val: number): string {
  if (val >= 0) return '#10b981'
  if (val >= -0.5) return '#eab308'
  return '#ef4444'
}

export function resultColor(val: number, isRate: boolean): string {
  return isRate ? rateDiffColor(val) : achievementColor(val)
}

// ─── Formatters (thin wrappers) ─────────────────────────

/** すでに 100倍済みの値を %表示する（formatPercent は 0-1 入力前提のため） */
export function formatPercent100(n: number): string {
  return `${n.toFixed(2)}%`
}

/** 値表示: 率は xx.xx%、金額はカンマ区切り */
export function fmtValue(n: number, isRate: boolean): string {
  if (isRate) return formatPercent100(n)
  return n.toLocaleString('ja-JP', { maximumFractionDigits: 0 })
}

/** 達成率/差異表示 */
export function fmtAchievement(val: number, isRate: boolean): string {
  if (isRate) return `${val >= 0 ? '+' : ''}${formatPercent100(val).replace('%', 'pp')}`
  return formatPercent100(val)
}

// ─── Date labels ────────────────────────────────────────

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

/** 日番号を「DD(曜)」表記に変換する */
export function dayLabel(day: number, year: number, month: number): string {
  const dow = DOW_LABELS[new Date(year, month - 1, day).getDay()]
  return `${day}(${dow})`
}
