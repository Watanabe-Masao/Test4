/**
 * 日別集約関数群（純粋関数）
 *
 * rawAggregation から抽出。日別集計、累積合計、移動平均、曜日パターンを担う。
 */
// ─── 型定義 ───────────────────────────────────────────

interface DayRecord {
  readonly dateKey: string
  readonly day: number
  readonly storeId: string
  readonly sales: number
}

/** 日別集約結果 */
export interface DailyAggregate {
  readonly dateKey: string
  readonly day: number
  readonly totalSales: number
  readonly storeCount: number
}

/** 累積売上結果 */
export interface CumulativeEntry {
  readonly dateKey: string
  readonly dailySales: number
  readonly cumulativeSales: number
}

/** 移動平均結果 */
export interface MovingAverageEntry {
  readonly dateKey: string
  readonly value: number
  readonly ma: number | null
}

/** 曜日別集約結果 */
export interface DowAggregate {
  readonly dow: number
  readonly avgSales: number
  readonly dayCount: number
  readonly stddev: number
}

// ─── 日別集約 ─────────────────────────────────────────

/**
 * レコード配列を日別に集約する。
 *
 * SQL: GROUP BY date_key + SUM(sales) の JS 置き換え。
 */
export function aggregateByDay<T extends DayRecord>(records: readonly T[]): DailyAggregate[] {
  const map = new Map<string, { totalSales: number; day: number; storeIds: Set<string> }>()

  for (const r of records) {
    const entry = map.get(r.dateKey)
    if (entry) {
      entry.totalSales += r.sales
      entry.storeIds.add(r.storeId)
    } else {
      map.set(r.dateKey, {
        totalSales: r.sales,
        day: r.day,
        storeIds: new Set([r.storeId]),
      })
    }
  }

  const result: DailyAggregate[] = []
  for (const [dateKey, entry] of map) {
    result.push({
      dateKey,
      day: entry.day,
      totalSales: entry.totalSales,
      storeCount: entry.storeIds.size,
    })
  }

  return result.sort((a, b) => (a.dateKey < b.dateKey ? -1 : a.dateKey > b.dateKey ? 1 : 0))
}

// ─── 累積合計 ─────────────────────────────────────────

/**
 * 日別売上の累積合計を計算する。
 *
 * SQL: SUM(sales) OVER (ORDER BY date_key) の JS 置き換え。
 */
export function cumulativeSum(
  dailyData: readonly { readonly dateKey: string; readonly totalSales: number }[],
): CumulativeEntry[] {
  const sorted = [...dailyData].sort((a, b) =>
    a.dateKey < b.dateKey ? -1 : a.dateKey > b.dateKey ? 1 : 0,
  )

  let cumulative = 0
  return sorted.map((d) => {
    cumulative += d.totalSales
    return {
      dateKey: d.dateKey,
      dailySales: d.totalSales,
      cumulativeSales: cumulative,
    }
  })
}

// ─── 移動平均 ─────────────────────────────────────────

/**
 * N日移動平均を計算する。
 *
 * @param dailyData dateKey 順にソート済みの日別データ
 * @param windowSize 移動平均の窓サイズ（3, 7, 28 等）
 */
export function movingAverage(
  dailyData: readonly { readonly dateKey: string; readonly value: number }[],
  windowSize: number,
): MovingAverageEntry[] {
  const sorted = [...dailyData].sort((a, b) =>
    a.dateKey < b.dateKey ? -1 : a.dateKey > b.dateKey ? 1 : 0,
  )

  return sorted.map((d, i) => {
    if (i < windowSize - 1) {
      return { dateKey: d.dateKey, value: d.value, ma: null }
    }
    let sum = 0
    for (let j = i - windowSize + 1; j <= i; j++) {
      sum += sorted[j].value
    }
    return { dateKey: d.dateKey, value: d.value, ma: sum / windowSize }
  })
}

// ─── 曜日パターン ─────────────────────────────────────

/**
 * 曜日別の平均売上・標準偏差を計算する。
 */
export function dowAggregate(
  dailyData: readonly { readonly dateKey: string; readonly totalSales: number }[],
): DowAggregate[] {
  const dowMap = new Map<number, number[]>()

  for (const d of dailyData) {
    // 非営業日（totalSales = 0）は曜日パターンから除外
    if (d.totalSales <= 0) continue
    const parts = d.dateKey.split('-')
    const dow = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getDay()
    const arr = dowMap.get(dow) ?? []
    arr.push(d.totalSales)
    dowMap.set(dow, arr)
  }

  const result: DowAggregate[] = []
  for (const [dow, sales] of dowMap) {
    const count = sales.length
    const avg = sales.reduce((s, v) => s + v, 0) / count
    const variance = sales.reduce((s, v) => s + (v - avg) ** 2, 0) / count
    const stddev = Math.sqrt(variance)
    result.push({ dow, avgSales: avg, dayCount: count, stddev })
  }

  return result.sort((a, b) => a.dow - b.dow)
}
