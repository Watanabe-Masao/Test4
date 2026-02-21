/**
 * 時間帯分析の共通ユーティリティ
 *
 * ピークタイム: 最も販売実績が多い単一時間帯（既存）
 * コアタイム:   3連続時間の累計合計が最大となる時間帯
 * 折り返し時間帯: 累積売上が50%に到達する時間帯
 */

/** 3連続時間帯の累計合計が最大となるウィンドウを検出する */
export function findCoreTime(
  hourlyMap: Map<number, number>,
): { startHour: number; endHour: number; total: number } | null {
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
export function findTurnaroundHour(hourlyMap: Map<number, number>): number | null {
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

/** コアタイム表示用フォーマット (例: "11〜13時") */
export function formatCoreTime(ct: { startHour: number; endHour: number } | null): string {
  if (!ct) return '-'
  return `${ct.startHour}〜${ct.endHour}時`
}

/** 折り返し時間帯表示用フォーマット (例: "12時台") */
export function formatTurnaroundHour(hour: number | null): string {
  if (hour == null) return '-'
  return `${hour}時台`
}
