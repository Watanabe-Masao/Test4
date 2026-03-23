/**
 * HourlyChart — 純粋計算ロジック
 *
 * useMemo 内の純粋関数部分を抽出（C1: 1ファイル = 1変更理由）。
 */
import type { CategoryTimeSalesRecord } from '@/domain/models/record'
import { COLORS, type HourCategoryItem } from './drilldownUtils'

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
  dayRecords: readonly CategoryTimeSalesRecord[],
  prevDayRecords: readonly CategoryTimeSalesRecord[],
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
      const key = `${rec.department.code}|${rec.line.code}|${rec.klass.code}`
      const ex = map.get(key) ?? {
        dept: rec.department.name || rec.department.code,
        line: rec.line.name || rec.line.code,
        klass: rec.klass.name || rec.klass.code,
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
