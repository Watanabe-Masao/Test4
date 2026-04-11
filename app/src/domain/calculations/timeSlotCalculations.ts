/**
 * 時間帯分析の純粋計算ロジック
 *
 * ピークタイム: 最も販売実績が多い単一時間帯
 * コアタイム:   3連続時間の累計合計が最大となる時間帯
 * 折り返し時間帯: 累積売上が50%に到達する時間帯
 *
 * @layer Domain — analytic-authoritative Calculation
 * @contractId ANA-001
 * @semanticClass analytic
 * @authorityKind analytic-authoritative
 * @methodFamily time_pattern
 */

import { z } from 'zod'

// ─── Zod Schemas ────────────────────────��────────────

export const CoreTimeResultSchema = z
  .object({
    startHour: z.number(),
    endHour: z.number(),
    total: z.number(),
  })
  .nullable()
export type CoreTimeResult = z.infer<typeof CoreTimeResultSchema>

export const TurnaroundHourResultSchema = z.number().nullable()
export type TurnaroundHourResult = z.infer<typeof TurnaroundHourResultSchema>

/** 3連続時間帯の累計合計が最大となるウィンドウを検出する */
export function findCoreTime(hourlyMap: Map<number, number>): CoreTimeResult {
  if (hourlyMap.size === 0) return null

  const minHour = Math.min(...hourlyMap.keys())
  const maxHour = Math.max(...hourlyMap.keys())

  // 時間帯が3未満の場合は全範囲をコアタイムとする
  if (maxHour - minHour < 2) {
    const total = [...hourlyMap.values()].reduce((s, v) => s + v, 0)
    return { startHour: minHour, endHour: maxHour, total }
  }

  let bestStart = minHour
  let bestTotal = 0

  for (let start = minHour; start <= maxHour - 2; start++) {
    const total =
      (hourlyMap.get(start) ?? 0) +
      (hourlyMap.get(start + 1) ?? 0) +
      (hourlyMap.get(start + 2) ?? 0)
    if (total > bestTotal) {
      bestTotal = total
      bestStart = start
    }
  }

  return { startHour: bestStart, endHour: bestStart + 2, total: bestTotal }
}

/** 累積売上が50%に到達する時間帯を検出する */
export function findTurnaroundHour(hourlyMap: Map<number, number>): TurnaroundHourResult {
  const hours = [...hourlyMap.entries()].sort((a, b) => a[0] - b[0])
  const total = hours.reduce((s, [, v]) => s + v, 0)
  if (total === 0) return null

  let cumulative = 0
  for (const [hour, amount] of hours) {
    cumulative += amount
    if (cumulative >= total * 0.5) return hour
  }
  return null
}

/** 配列ベースのデータから hourly Map を構築するヘルパー */
export function buildHourlyMap(
  data: readonly { hour: number; amount: number }[],
): Map<number, number> {
  const map = new Map<number, number>()
  for (const d of data) {
    map.set(d.hour, (map.get(d.hour) ?? 0) + d.amount)
  }
  return map
}
