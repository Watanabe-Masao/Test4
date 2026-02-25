/**
 * 分類別時間帯売上の集約純粋関数
 *
 * フィルタ済みレコードを集約し、UI が必要とするデータ構造に変換する。
 * これらの関数は hooks から呼ばれ、UI コンポーネントには直接公開しない。
 *
 * ## 設計ルール
 *
 * - 集約関数は**生の合計値**を返す（除数適用前）
 * - 除数の適用は hooks 側で行う（モードの切替に応じて再計算が必要なため）
 * - timeSlots からの集計のみ行い、外部データソースから再計算しない（禁止事項2）
 */
import type { CategoryTimeSalesRecord } from '@/domain/models'

/* ── 時間帯別集約 ─────────────────────────────────────────── */

/** 時間帯別の集約結果（生の合計値、除数未適用） */
export interface HourlyAggregation {
  /** hour → { amount, quantity } の生の合計 */
  readonly hourly: ReadonlyMap<number, { readonly amount: number; readonly quantity: number }>
  /** 全レコードの totalAmount 合計 */
  readonly totalAmount: number
  /** 全レコードの totalQuantity 合計 */
  readonly totalQuantity: number
  /** 集約対象レコード数 */
  readonly recordCount: number
}

/**
 * フィルタ済みレコードを時間帯別に集約する。
 *
 * @param records queryByDateRange 適用済みレコード
 * @returns 生の合計値（除数未適用）
 */
export function aggregateHourly(
  records: readonly CategoryTimeSalesRecord[],
): HourlyAggregation {
  const hourly = new Map<number, { amount: number; quantity: number }>()
  let totalAmount = 0
  let totalQuantity = 0

  for (const rec of records) {
    totalAmount += rec.totalAmount
    totalQuantity += rec.totalQuantity
    for (const slot of rec.timeSlots) {
      const existing = hourly.get(slot.hour)
      if (existing) {
        existing.amount += slot.amount
        existing.quantity += slot.quantity
      } else {
        hourly.set(slot.hour, { amount: slot.amount, quantity: slot.quantity })
      }
    }
  }

  return { hourly, totalAmount, totalQuantity, recordCount: records.length }
}

/* ── 階層レベル別集約 ──────────────────────────────────────── */

/** 階層レベル別の集約エントリ（生の合計値、除数未適用） */
export interface LevelAggregationEntry {
  readonly code: string
  readonly name: string
  /** totalAmount の合計（生値） */
  readonly amount: number
  /** totalQuantity の合計（生値） */
  readonly quantity: number
  /** hour → amount の合計（生値） */
  readonly hours: ReadonlyMap<number, number>
  /** 子カテゴリのユニーク数 */
  readonly childCount: number
}

/**
 * フィルタ済みレコードを階層レベル（部門/ライン/クラス）でグルーピング集約する。
 *
 * @param records queryByDateRange 適用済みレコード
 * @param level 集約対象の階層レベル
 * @returns code → LevelAggregationEntry のマップ（生の合計値）
 */
export function aggregateByLevel(
  records: readonly CategoryTimeSalesRecord[],
  level: 'department' | 'line' | 'klass',
): ReadonlyMap<string, LevelAggregationEntry> {
  const map = new Map<string, {
    code: string
    name: string
    amount: number
    quantity: number
    hours: Map<number, number>
    children: Set<string>
  }>()

  for (const rec of records) {
    let key: string
    let name: string
    let childKey: string

    if (level === 'department') {
      key = rec.department.code
      name = rec.department.name || key
      childKey = rec.line.code
    } else if (level === 'line') {
      key = rec.line.code
      name = rec.line.name || key
      childKey = rec.klass.code
    } else {
      key = rec.klass.code
      name = rec.klass.name || key
      childKey = ''
    }

    const existing = map.get(key)
    if (existing) {
      existing.amount += rec.totalAmount
      existing.quantity += rec.totalQuantity
      if (childKey) existing.children.add(childKey)
      for (const s of rec.timeSlots) {
        existing.hours.set(s.hour, (existing.hours.get(s.hour) ?? 0) + s.amount)
      }
    } else {
      const hours = new Map<number, number>()
      for (const s of rec.timeSlots) {
        hours.set(s.hour, (hours.get(s.hour) ?? 0) + s.amount)
      }
      const children = new Set<string>()
      if (childKey) children.add(childKey)
      map.set(key, { code: key, name, amount: rec.totalAmount, quantity: rec.totalQuantity, hours, children })
    }
  }

  // children Set → childCount に変換
  const result = new Map<string, LevelAggregationEntry>()
  for (const [key, entry] of map) {
    result.set(key, {
      code: entry.code,
      name: entry.name,
      amount: entry.amount,
      quantity: entry.quantity,
      hours: entry.hours,
      childCount: entry.children.size,
    })
  }

  return result
}

/* ── 時間帯×曜日マトリクス ──────────────────────────────────── */

/** hour × dow の生の集約値 */
export interface HourDowAggregation {
  /** hour → dow → amount の生の合計 */
  readonly matrix: ReadonlyMap<number, ReadonlyMap<number, number>>
  /** dow → Set<day> 各曜日の実データ日セット（dowAvg 除数計算用） */
  readonly dowDaySets: ReadonlyMap<number, ReadonlySet<number>>
  /** 全 distinct day の集合 */
  readonly allDays: ReadonlySet<number>
}

/**
 * フィルタ済みレコードを hour × dow のマトリクスに集約する。
 *
 * ヒートマップ表示用。dowAvg モードでは曜日ごとに異なる除数を適用する必要があるため、
 * dowDaySets も合わせて返す。
 *
 * @param records queryByDateRange 適用済みレコード
 * @param year 年（曜日計算用）
 * @param month 月（曜日計算用）
 * @returns 生の hour × dow 集約データ
 */
export function aggregateHourDow(
  records: readonly CategoryTimeSalesRecord[],
  year: number,
  month: number,
): HourDowAggregation {
  const matrix = new Map<number, Map<number, number>>()
  const dowDaySets = new Map<number, Set<number>>()
  const allDays = new Set<number>()

  for (const rec of records) {
    const dow = new Date(year, month - 1, rec.day).getDay()
    allDays.add(rec.day)

    if (!dowDaySets.has(dow)) dowDaySets.set(dow, new Set())
    dowDaySets.get(dow)!.add(rec.day)

    for (const slot of rec.timeSlots) {
      let dowMap = matrix.get(slot.hour)
      if (!dowMap) {
        dowMap = new Map()
        matrix.set(slot.hour, dowMap)
      }
      dowMap.set(dow, (dowMap.get(dow) ?? 0) + slot.amount)
    }
  }

  return { matrix, dowDaySets, allDays }
}

/* ── 店舗別時間帯集約 ──────────────────────────────────────── */

/** 店舗別の時間帯集約エントリ */
export interface StoreHourlyEntry {
  readonly storeId: string
  /** hour → amount の生の合計 */
  readonly hours: ReadonlyMap<number, number>
  /** 生の合計金額 */
  readonly totalAmount: number
}

/**
 * レコードを店舗別×時間帯で集約する。
 *
 * 店舗間比較チャート用。
 *
 * @param records queryByDateRange 適用済みレコード
 * @returns storeId → StoreHourlyEntry のマップ
 */
export function aggregateByStore(
  records: readonly CategoryTimeSalesRecord[],
): ReadonlyMap<string, StoreHourlyEntry> {
  const map = new Map<string, { storeId: string; hours: Map<number, number>; totalAmount: number }>()

  for (const rec of records) {
    const existing = map.get(rec.storeId)
    if (existing) {
      existing.totalAmount += rec.totalAmount
      for (const slot of rec.timeSlots) {
        existing.hours.set(slot.hour, (existing.hours.get(slot.hour) ?? 0) + slot.amount)
      }
    } else {
      const hours = new Map<number, number>()
      for (const slot of rec.timeSlots) {
        hours.set(slot.hour, (hours.get(slot.hour) ?? 0) + slot.amount)
      }
      map.set(rec.storeId, { storeId: rec.storeId, hours, totalAmount: rec.totalAmount })
    }
  }

  return map
}
