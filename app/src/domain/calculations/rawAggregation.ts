/**
 * 生レコード集約関数群 — DuckDB SQL 計算の JS 置き換え
 *
 * DuckDB から取得した生レコード（StoreDaySummaryRow, CategoryTimeSalesRecord 等）に対し、
 * これまで SQL 内で行っていた集約・統計計算を JS 純粋関数で実行する。
 *
 * ## 設計原則
 *
 * - 全関数は純粋関数（副作用なし、同じ入力に同じ出力）
 * - domain 層のためフレームワーク非依存
 * - 二重実装禁止: これらの関数が正規の計算ロジック。SQL 側の集約は段階的に廃止
 * - 0除算防止: safeDivide を使用
 */
import { safeDivide } from './utils'

// ─── 型定義 ───────────────────────────────────────────

/**
 * 日別レコードの最小インターフェース
 *
 * StoreDaySummaryRow / DailyRecordRow のサブセット。
 * 必要なフィールドのみ要求し、柔軟に使えるようにする。
 */
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

/** 時間帯集約結果 */
export interface HourlyAggregate {
  readonly hour: number
  readonly totalAmount: number
  readonly totalQuantity: number
}

/** 期間集約レート結果 */
export interface PeriodRates {
  readonly totalSales: number
  readonly totalPurchaseCost: number
  readonly totalDiscountAbsolute: number
  readonly discountRate: number
  readonly totalFlowersCost: number
  readonly totalDirectProduceCost: number
  readonly totalCostInclusionCost: number
  readonly totalCustomers: number
}

// ─── 日別集約 ─────────────────────────────────────────

/**
 * レコード配列を日別に集約する。
 *
 * SQL: GROUP BY date_key + SUM(sales) の JS 置き換え。
 * 複数店舗のレコードを日ごとにまとめて合算する。
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
 * 入力は aggregateByDay の結果、または dateKey + sales を持つ任意の配列。
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
 * SQL: AVG(sales) OVER (ORDER BY date_key ROWS BETWEEN N-1 PRECEDING AND CURRENT ROW) の JS 置き換え。
 * 先頭 N-1 個は ma: null（データ不足）。
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
 *
 * SQL: AVG(daily_sales) per dow, STDDEV_POP(daily_sales) per dow の JS 置き換え。
 *
 * dateKey (YYYY-MM-DD) から直接曜日を計算するため月跨ぎデータに対応。
 */
export function dowAggregate(
  dailyData: readonly { readonly dateKey: string; readonly totalSales: number }[],
): DowAggregate[] {
  // 曜日ごとに売上を収集
  const dowMap = new Map<number, number[]>()

  for (const d of dailyData) {
    // dateKey (YYYY-MM-DD) から直接 Date を生成して曜日を取得
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

    // 母標準偏差（STDDEV_POP）
    const variance = sales.reduce((s, v) => s + (v - avg) ** 2, 0) / count
    const stddev = Math.sqrt(variance)

    result.push({ dow, avgSales: avg, dayCount: count, stddev })
  }

  return result.sort((a, b) => a.dow - b.dow)
}

// ─── 時間帯集約 ───────────────────────────────────────

/**
 * 時間帯別の売上・数量を集約する。
 *
 * SQL: SUM(amount), SUM(quantity) GROUP BY hour の JS 置き換え。
 */
export function hourlyAggregate(
  records: readonly {
    readonly timeSlots: readonly {
      readonly hour: number
      readonly amount: number
      readonly quantity: number
    }[]
  }[],
): HourlyAggregate[] {
  const map = new Map<number, { amount: number; quantity: number }>()

  for (const r of records) {
    for (const slot of r.timeSlots) {
      const entry = map.get(slot.hour)
      if (entry) {
        entry.amount += slot.amount
        entry.quantity += slot.quantity
      } else {
        map.set(slot.hour, { amount: slot.amount, quantity: slot.quantity })
      }
    }
  }

  const result: HourlyAggregate[] = []
  for (const [hour, entry] of map) {
    result.push({ hour, totalAmount: entry.amount, totalQuantity: entry.quantity })
  }
  return result.sort((a, b) => a.hour - b.hour)
}

// ─── 期間集約レート ───────────────────────────────────

/**
 * 期間内の各種合計値・レートを集約する。
 *
 * SQL: SUM(sales), SUM(purchase_cost), ... + discount_rate 計算の JS 置き換え。
 */
export function aggregatePeriodRates(
  records: readonly {
    readonly sales: number
    readonly purchaseCost: number
    readonly discountAbsolute: number
    readonly flowersCost: number
    readonly directProduceCost: number
    readonly costInclusionCost: number
    readonly customers: number
  }[],
): PeriodRates {
  let totalSales = 0
  let totalPurchaseCost = 0
  let totalDiscountAbsolute = 0
  let totalFlowersCost = 0
  let totalDirectProduceCost = 0
  let totalCostInclusionCost = 0
  let totalCustomers = 0

  for (const r of records) {
    totalSales += r.sales
    totalPurchaseCost += r.purchaseCost
    totalDiscountAbsolute += r.discountAbsolute
    totalFlowersCost += r.flowersCost
    totalDirectProduceCost += r.directProduceCost
    totalCostInclusionCost += r.costInclusionCost
    totalCustomers += r.customers
  }

  return {
    totalSales,
    totalPurchaseCost,
    totalDiscountAbsolute,
    discountRate: safeDivide(totalDiscountAbsolute, totalSales, 0),
    totalFlowersCost,
    totalDirectProduceCost,
    totalCostInclusionCost,
    totalCustomers,
  }
}

// ─── 統計量 ───────────────────────────────────────────

/**
 * 母標準偏差（STDDEV_POP）を計算する。
 *
 * SQL: STDDEV_POP(values) の JS 置き換え。
 */
export function stddevPop(values: readonly number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

/**
 * Z-score を計算する。
 *
 * SQL: (value - AVG()) / STDDEV_POP() の JS 置き換え。
 * stddev が 0 の場合は 0 を返す。
 */
export function zScore(value: number, mean: number, stddev: number): number {
  return safeDivide(value - mean, stddev, 0)
}

/**
 * 変動係数（CV: Coefficient of Variation）を計算する。
 *
 * SQL: STDDEV_POP(sales) / AVG(sales) の JS 置き換え。
 * mean が 0 の場合は 0 を返す。
 */
export function coefficientOfVariation(values: readonly number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((s, v) => s + v, 0) / values.length
  return safeDivide(stddevPop(values), mean, 0)
}

// ─── ランキング ───────────────────────────────────────

/**
 * 配列を指定フィールドでランキングする。
 *
 * SQL: RANK() OVER (ORDER BY field DESC) の JS 置き換え。
 * 同値は同じ順位（1, 1, 3 方式）。
 */
export function rankBy<T>(
  items: readonly T[],
  getValue: (item: T) => number,
): (T & { rank: number })[] {
  const sorted = [...items].sort((a, b) => getValue(b) - getValue(a))
  let currentRank = 1

  return sorted.map((item, i) => {
    if (i > 0 && getValue(sorted[i]) < getValue(sorted[i - 1])) {
      currentRank = i + 1
    }
    return { ...item, rank: currentRank }
  })
}

// ─── YoY 比較 ─────────────────────────────────────────

/** YoY マージ結果 */
export interface YoyEntry<T> {
  readonly key: string
  readonly current: T | null
  readonly previous: T | null
}

/**
 * 当期と前期のデータを FULL OUTER JOIN 相当でマージする。
 *
 * SQL: FULL OUTER JOIN current ON previous.key の JS 置き換え。
 */
export function yoyMerge<T>(
  current: readonly T[],
  previous: readonly T[],
  getKey: (item: T) => string,
): YoyEntry<T>[] {
  const currentMap = new Map<string, T>()
  for (const item of current) currentMap.set(getKey(item), item)

  const previousMap = new Map<string, T>()
  for (const item of previous) previousMap.set(getKey(item), item)

  // 全キーを収集
  const allKeys = new Set([...currentMap.keys(), ...previousMap.keys()])

  const result: YoyEntry<T>[] = []
  for (const key of allKeys) {
    result.push({
      key,
      current: currentMap.get(key) ?? null,
      previous: previousMap.get(key) ?? null,
    })
  }

  return result.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0))
}

// ─── カテゴリシェア ───────────────────────────────────

/** カテゴリシェア結果 */
export interface CategoryShare {
  readonly code: string
  readonly name: string
  readonly amount: number
  readonly share: number
}

/**
 * カテゴリ別売上シェアを計算する。
 *
 * SQL: amount / SUM(amount) OVER () の JS 置き換え。
 */
export function categoryShare(
  records: readonly { readonly code: string; readonly name: string; readonly amount: number }[],
): CategoryShare[] {
  const total = records.reduce((s, r) => s + r.amount, 0)
  return records.map((r) => ({
    code: r.code,
    name: r.name,
    amount: r.amount,
    share: safeDivide(r.amount, total, 0),
  }))
}
