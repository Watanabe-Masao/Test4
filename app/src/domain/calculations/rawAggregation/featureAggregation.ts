/**
 * 特徴量集約関数
 *
 * jsAggregationLogic.ts から抽出した pure 関数群。
 * infrastructure 型に依存しない generic signature で定義。
 */
import { movingAverage } from './dailyAggregation'
import { stddevPop, zScore as calcZScore, coefficientOfVariation } from './statisticalFunctions'
import { safeDivide } from '../utils'

// ── 出力型 ───────────────────────────────────────────

export interface DowPatternRow {
  readonly storeId: string
  readonly dow: number
  readonly avgSales: number
  readonly dayCount: number
  readonly salesStddev: number | null
}

export interface DailyFeatureRow {
  readonly storeId: string
  readonly dateKey: string
  readonly sales: number
  readonly salesMa3: number | null
  readonly salesMa7: number | null
  readonly salesMa28: number | null
  readonly salesDiff1d: number | null
  readonly salesDiff7d: number | null
  readonly cumulativeSales: number
  readonly cv7day: number | null
  readonly cv28day: number | null
  readonly zScore: number | null
  readonly spikeRatio: number | null
}

export interface HourlyProfileRow {
  readonly storeId: string
  readonly hour: number
  readonly totalAmount: number
  readonly hourShare: number
  readonly hourRank: number
}

// ── minimal 入力型 ──────────────────────────────────

/** computeDowPattern の入力行 */
export interface DowPatternInput {
  readonly storeId: string
  readonly dateKey: string
  readonly sales: number
}

/** computeDailyFeatures の入力行 */
export interface DailyFeatureInput {
  readonly storeId: string
  readonly dateKey: string
  readonly sales: number
}

// ── 曜日パターン ─────────────────────────────────────

/**
 * 店舗別曜日パターンを計算する。
 *
 * DuckDB SQL の WITH daily AS (...) GROUP BY store_id, dow と同等。
 */
export function computeDowPattern(rows: readonly DowPatternInput[]): DowPatternRow[] {
  const storeMap = new Map<string, Map<string, number>>()
  for (const r of rows) {
    let dateMap = storeMap.get(r.storeId)
    if (!dateMap) {
      dateMap = new Map()
      storeMap.set(r.storeId, dateMap)
    }
    dateMap.set(r.dateKey, (dateMap.get(r.dateKey) ?? 0) + r.sales)
  }

  const result: DowPatternRow[] = []

  for (const [storeId, dateMap] of storeMap) {
    const dowSales = new Map<number, number[]>()
    for (const [dateKey, sales] of dateMap) {
      const parts = dateKey.split('-')
      const dow = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).getDay()
      const arr = dowSales.get(dow) ?? []
      arr.push(sales)
      dowSales.set(dow, arr)
    }

    for (const [dow, sales] of dowSales) {
      const count = sales.length
      const avg = sales.reduce((s, v) => s + v, 0) / count
      const variance = sales.reduce((s, v) => s + (v - avg) ** 2, 0) / count
      result.push({
        storeId,
        dow,
        avgSales: avg,
        dayCount: count,
        salesStddev: Math.sqrt(variance),
      })
    }
  }

  return result.sort((a, b) => {
    if (a.storeId < b.storeId) return -1
    if (a.storeId > b.storeId) return 1
    return a.dow - b.dow
  })
}

// ── 日別特徴量 ───────────────────────────────────────

/**
 * 店舗別日次特徴量を計算する。
 *
 * DuckDB SQL の WINDOW w3/w7/w28 と等価な計算を JS で行う。
 *
 * @param rows 生データ（拡張範囲を含む場合あり）
 * @param trimFromDateKey 指定時、この日付以降の行のみを返す（MA計算用の先行データは含めない）
 */
export function computeDailyFeatures(
  rows: readonly DailyFeatureInput[],
  trimFromDateKey?: string,
): DailyFeatureRow[] {
  const storeMap = new Map<string, { dateKey: string; sales: number }[]>()
  for (const r of rows) {
    const arr = storeMap.get(r.storeId) ?? []
    arr.push({ dateKey: r.dateKey, sales: r.sales })
    storeMap.set(r.storeId, arr)
  }

  const result: DailyFeatureRow[] = []

  for (const [storeId, records] of storeMap) {
    const sorted = [...records].sort((a, b) =>
      a.dateKey < b.dateKey ? -1 : a.dateKey > b.dateKey ? 1 : 0,
    )
    const values = sorted.map((r) => r.sales)

    const ma3 = movingAverage(
      sorted.map((r) => ({ dateKey: r.dateKey, value: r.sales })),
      3,
    )
    const ma7 = movingAverage(
      sorted.map((r) => ({ dateKey: r.dateKey, value: r.sales })),
      7,
    )
    const ma28 = movingAverage(
      sorted.map((r) => ({ dateKey: r.dateKey, value: r.sales })),
      28,
    )

    let cumulative = 0

    for (let i = 0; i < sorted.length; i++) {
      const sales = values[i]
      cumulative += sales

      const diff1d = i >= 1 ? sales - values[i - 1] : null
      const diff7d = i >= 7 ? sales - values[i - 7] : null

      let cv7day: number | null = null
      if (i >= 6) {
        const window7 = values.slice(i - 6, i + 1)
        cv7day = coefficientOfVariation(window7)
      }

      let cv28day: number | null = null
      if (i >= 27) {
        const window28 = values.slice(i - 27, i + 1)
        cv28day = coefficientOfVariation(window28)
      }

      let zScoreVal: number | null = null
      if (i >= 27) {
        const window28 = values.slice(i - 27, i + 1)
        const mean = window28.reduce((s, v) => s + v, 0) / window28.length
        const sd = stddevPop(window28)
        zScoreVal = sd > 0 ? calcZScore(sales, mean, sd) : null
      }

      let spikeRatio: number | null = null
      if (i >= 6) {
        const ma7val = ma7[i].ma
        spikeRatio = ma7val != null && ma7val > 0 ? safeDivide(sales, ma7val, 0) : null
      }

      result.push({
        storeId,
        dateKey: sorted[i].dateKey,
        sales,
        salesMa3: ma3[i].ma,
        salesMa7: ma7[i].ma,
        salesMa28: ma28[i].ma,
        salesDiff1d: diff1d,
        salesDiff7d: diff7d,
        cumulativeSales: cumulative,
        cv7day,
        cv28day,
        zScore: zScoreVal,
        spikeRatio,
      })
    }
  }

  if (trimFromDateKey) {
    return result.filter((r) => r.dateKey >= trimFromDateKey)
  }
  return result
}

// ── 時間帯プロファイル ───────────────────────────────

/**
 * 店舗×時間帯データから HourlyProfileRow[] を生成する。
 *
 * SQL の SUM(amount) OVER (PARTITION BY store_id) → hourShare
 * RANK() OVER (PARTITION BY store_id ORDER BY SUM(amount) DESC) → hourRank
 */
export function computeHourlyProfile(
  rows: readonly { readonly storeId: string; readonly hour: number; readonly amount: number }[],
): HourlyProfileRow[] {
  const storeMap = new Map<string, Map<number, number>>()
  for (const r of rows) {
    let hourMap = storeMap.get(r.storeId)
    if (!hourMap) {
      hourMap = new Map()
      storeMap.set(r.storeId, hourMap)
    }
    hourMap.set(r.hour, (hourMap.get(r.hour) ?? 0) + r.amount)
  }

  const result: HourlyProfileRow[] = []

  for (const [storeId, hourMap] of storeMap) {
    let storeTotal = 0
    for (const amount of hourMap.values()) storeTotal += amount

    const entries = [...hourMap.entries()].map(([hour, amount]) => ({
      hour,
      amount,
      share: safeDivide(amount, storeTotal, 0),
    }))

    const sorted = [...entries].sort((a, b) => b.amount - a.amount)
    let currentRank = 1
    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i].amount < sorted[i - 1].amount) {
        currentRank = i + 1
      }
      const e = sorted[i]
      result.push({
        storeId,
        hour: e.hour,
        totalAmount: e.amount,
        hourShare: e.share,
        hourRank: currentRank,
      })
    }
  }

  return result.sort((a, b) => {
    if (a.storeId < b.storeId) return -1
    if (a.storeId > b.storeId) return 1
    return a.hour - b.hour
  })
}
