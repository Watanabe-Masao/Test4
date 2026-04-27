/**
 * HourlyChart — 純粋計算ロジック
 *
 * useMemo 内の純粋関数部分を抽出（C1: 1ファイル = 1変更理由）。
 *
 * @responsibility R:unclassified
 */
import type { CategoryLeafDailyEntry } from '@/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types'
import { COLORS, type HourCategoryItem } from './drilldownUtils'

/**
 * CTS レコードから時間帯別の売上・数量マップを構築し、
 * min〜max の範囲でゼロ埋めした配列を返す。
 */
export function buildHourlyData(
  recs: readonly CategoryLeafDailyEntry[],
): { hour: number; amount: number; quantity: number }[] {
  const map = new Map<number, { amount: number; quantity: number }>()
  for (const rec of recs) {
    for (const slot of rec.timeSlots) {
      const ex = map.get(slot.hour) ?? { amount: 0, quantity: 0 }
      ex.amount += slot.amount
      ex.quantity += slot.quantity
      map.set(slot.hour, ex)
    }
  }
  const entries = [...map.entries()].sort(([a], [b]) => a - b)
  if (entries.length === 0) return []
  const minH = Math.min(...entries.map(([h]) => h))
  const maxH = Math.max(...entries.map(([h]) => h))
  const result: { hour: number; amount: number; quantity: number }[] = []
  for (let h = minH; h <= maxH; h++) {
    const d = map.get(h)
    result.push({ hour: h, amount: d?.amount ?? 0, quantity: d?.quantity ?? 0 })
  }
  return result
}

/**
 * 選択時間帯の売上・数量合計を計算する
 */
export function computeSelectedData(
  selectedHours: ReadonlySet<number>,
  paddedData: readonly { hour: number; amount: number; quantity: number }[],
): { amount: number; quantity: number } | null {
  if (selectedHours.size === 0) return null
  let amount = 0
  let quantity = 0
  for (const d of paddedData) {
    if (selectedHours.has(d.hour)) {
      amount += d.amount
      quantity += d.quantity
    }
  }
  return { amount, quantity }
}

/**
 * 選択時間帯のカテゴリ別内訳を構築する
 */
export function buildHourCategoryDetail(
  selectedHours: ReadonlySet<number>,
  dayRecords: readonly CategoryLeafDailyEntry[],
  prevDayRecords: readonly CategoryLeafDailyEntry[],
  hourlyMode: string,
): HourCategoryItem[] {
  if (selectedHours.size === 0) return []
  const sourceRecs = hourlyMode === 'prev' ? prevDayRecords : dayRecords
  const map = new Map<
    string,
    { dept: string; line: string; klass: string; amount: number; quantity: number }
  >()
  for (const rec of sourceRecs) {
    for (const slot of rec.timeSlots) {
      if (!selectedHours.has(slot.hour)) continue
      if (slot.amount === 0 && slot.quantity === 0) continue
      const key = `${rec.deptCode}|${rec.lineCode}|${rec.klassCode}`
      const ex = map.get(key) ?? {
        dept: rec.deptName || rec.deptCode,
        line: rec.lineName || rec.lineCode,
        klass: rec.klassName || rec.klassCode,
        amount: 0,
        quantity: 0,
      }
      ex.amount += slot.amount
      ex.quantity += slot.quantity
      map.set(key, ex)
    }
  }
  const items = [...map.values()].sort((a, b) => b.amount - a.amount)
  const totalAmt = items.reduce((s, it) => s + it.amount, 0)
  return items.map((it, i) => ({
    ...it,
    pct: totalAmt > 0 ? (it.amount / totalAmt) * 100 : 0,
    color: COLORS[i % COLORS.length],
  }))
}

/**
 * 累積パーセントデータを構築する
 */
export function buildCumulativeData(
  paddedData: readonly { hour: number; amount: number }[],
  totalAmt: number,
): { hour: number; cumPct: number }[] {
  const result: { hour: number; cumPct: number }[] = []
  paddedData.reduce((acc, d) => {
    const running = acc + d.amount
    result.push({ hour: d.hour, cumPct: totalAmt > 0 ? (running / totalAmt) * 100 : 0 })
    return running
  }, 0)
  return result
}
