/**
 * SerialDayRecord — DuckDB生データのシリアル値変換層
 *
 * DuckDB → SerialDayRecord[] → JS処理 の境界で使用する。
 *
 * ## 月跨ぎ問題の解決
 *
 * 従来: DuckDB → (year, month, day) → JSが月境界を意識して処理
 * 新:   DuckDB → dateKey → DaySerial変換 → JSは連続整数で処理
 *
 * DaySerial により:
 * - 範囲フィルタ: serial >= from && serial <= to（月の概念不要）
 * - 移動平均: serial - 6 ～ serial（月跨ぎでも同じ算術）
 * - 日数差: toSerial - fromSerial + 1（月末日の計算不要）
 * - 曜日: serialToDow(serial)（Date オブジェクト不要）
 *
 * ## 設計原則
 *
 * - 変換は DuckDB→JS 境界で1回だけ行う
 * - 以降の JS 処理は DaySerial のみ使用（dateKey/day は参照しない）
 * - period1/period2 は独立した SerialDayRecord[] として扱う
 */
import type { DaySerial } from '@/domain/models/DaySerial'
import { dateKeyToSerial } from '@/domain/models/DaySerial'
import type { DateKey } from '@/domain/models/CalendarDate'

// ── 型定義 ──

/**
 * シリアル値付き日別レコード
 *
 * DuckDB の store_day_summary 行に daySerial を付与したもの。
 * JS側の全処理はこの型を入力として受け取る。
 */
export interface SerialDayRecord {
  /** 連続整数日付（2000-01-01=0） */
  readonly serial: DaySerial
  /** 店舗ID */
  readonly storeId: string
  /** 元の dateKey（デバッグ・表示用。処理には使わない） */
  readonly dateKey: DateKey
  /** 売上 */
  readonly sales: number
  /** プロパー売上 */
  readonly coreSales: number
  /** 総売上（売上+売変） */
  readonly grossSales: number
  /** 売変額（絶対値） */
  readonly discountAbsolute: number
  /** 仕入原価 */
  readonly purchaseCost: number
  /** 仕入売価 */
  readonly purchasePrice: number
  /** 店間移動入（原価） */
  readonly interStoreInCost: number
  /** 店間移動入（売価） */
  readonly interStoreInPrice: number
  /** 店間移動出（原価） */
  readonly interStoreOutCost: number
  /** 店間移動出（売価） */
  readonly interStoreOutPrice: number
  /** 部門間移動入（原価） */
  readonly interDeptInCost: number
  /** 部門間移動入（売価） */
  readonly interDeptInPrice: number
  /** 部門間移動出（原価） */
  readonly interDeptOutCost: number
  /** 部門間移動出（売価） */
  readonly interDeptOutPrice: number
  /** 花卉原価 */
  readonly flowersCost: number
  /** 花卉売価 */
  readonly flowersPrice: number
  /** 産直原価 */
  readonly directProduceCost: number
  /** 産直売価 */
  readonly directProducePrice: number
  /** 消耗品原価 */
  readonly costInclusionCost: number
  /** 客数 */
  readonly customers: number
}

/**
 * 期間データセット — period1/period2 それぞれが持つ
 *
 * シリアル値で範囲を保持するため、月の概念が不要。
 */
export interface SerialPeriodDataset {
  /** 期間の開始シリアル（inclusive） */
  readonly fromSerial: DaySerial
  /** 期間の終了シリアル（inclusive） */
  readonly toSerial: DaySerial
  /** 全レコード（シリアル値順） */
  readonly records: readonly SerialDayRecord[]
  /** 期間の日数 */
  readonly totalDays: number
}

// ── 変換関数 ──

/**
 * DuckDB の StoreDaySummaryRow[] → SerialDayRecord[] に変換する。
 *
 * DuckDB→JS 境界で1回だけ呼ぶ。以降は serial のみで処理。
 *
 * @param rows DuckDB から取得した生行データ
 * @returns シリアル値付きレコード配列（serial 昇順）
 */
export function toSerialRecords(
  rows: readonly {
    readonly dateKey: string
    readonly storeId: string
    readonly sales: number
    readonly coreSales: number
    readonly grossSales: number
    readonly discountAbsolute: number
    readonly purchaseCost: number
    readonly purchasePrice: number
    readonly interStoreInCost: number
    readonly interStoreInPrice: number
    readonly interStoreOutCost: number
    readonly interStoreOutPrice: number
    readonly interDeptInCost: number
    readonly interDeptInPrice: number
    readonly interDeptOutCost: number
    readonly interDeptOutPrice: number
    readonly flowersCost: number
    readonly flowersPrice: number
    readonly directProduceCost: number
    readonly directProducePrice: number
    readonly costInclusionCost: number
    readonly customers: number
  }[],
): SerialDayRecord[] {
  const result: SerialDayRecord[] = rows.map((row) => ({
    serial: dateKeyToSerial(row.dateKey as DateKey),
    storeId: row.storeId,
    dateKey: row.dateKey as DateKey,
    sales: row.sales,
    coreSales: row.coreSales,
    grossSales: row.grossSales,
    discountAbsolute: row.discountAbsolute,
    purchaseCost: row.purchaseCost,
    purchasePrice: row.purchasePrice,
    interStoreInCost: row.interStoreInCost,
    interStoreInPrice: row.interStoreInPrice,
    interStoreOutCost: row.interStoreOutCost,
    interStoreOutPrice: row.interStoreOutPrice,
    interDeptInCost: row.interDeptInCost,
    interDeptInPrice: row.interDeptInPrice,
    interDeptOutCost: row.interDeptOutCost,
    interDeptOutPrice: row.interDeptOutPrice,
    flowersCost: row.flowersCost,
    flowersPrice: row.flowersPrice,
    directProduceCost: row.directProduceCost,
    directProducePrice: row.directProducePrice,
    costInclusionCost: row.costInclusionCost,
    customers: row.customers,
  }))

  // serial 昇順でソート
  result.sort((a, b) => a.serial - b.serial)
  return result
}

// ── 集約ユーティリティ ──

/**
 * SerialDayRecord[] をシリアル値で集約（全店舗合算の日別データ）
 *
 * チャート用: x軸 = serial, y軸 = 合算値
 * 月の概念なし。連続整数の配列として処理できる。
 */
export function aggregateBySerial(
  records: readonly SerialDayRecord[],
): ReadonlyMap<DaySerial, AggregatedDayData> {
  const map = new Map<DaySerial, AggregatedDayData>()

  for (const r of records) {
    const existing = map.get(r.serial)
    if (existing) {
      map.set(r.serial, {
        serial: r.serial,
        sales: existing.sales + r.sales,
        coreSales: existing.coreSales + r.coreSales,
        grossSales: existing.grossSales + r.grossSales,
        discountAbsolute: existing.discountAbsolute + r.discountAbsolute,
        purchaseCost: existing.purchaseCost + r.purchaseCost,
        customers: existing.customers + r.customers,
      })
    } else {
      map.set(r.serial, {
        serial: r.serial,
        sales: r.sales,
        coreSales: r.coreSales,
        grossSales: r.grossSales,
        discountAbsolute: r.discountAbsolute,
        purchaseCost: r.purchaseCost,
        customers: r.customers,
      })
    }
  }

  return map
}

/** 日別集約データ（全店舗合算） */
export interface AggregatedDayData {
  readonly serial: DaySerial
  readonly sales: number
  readonly coreSales: number
  readonly grossSales: number
  readonly discountAbsolute: number
  readonly purchaseCost: number
  readonly customers: number
}

/**
 * シリアル範囲内の連続データ配列を生成する。
 *
 * データが無い日は 0 で埋める。月跨ぎでも隙間なく連続。
 *
 * @param aggregated aggregateBySerial の結果
 * @param from 開始シリアル（inclusive）
 * @param to 終了シリアル（inclusive）
 * @returns serial 昇順の連続配列
 */
export function toContinuousArray(
  aggregated: ReadonlyMap<DaySerial, AggregatedDayData>,
  from: DaySerial,
  to: DaySerial,
): AggregatedDayData[] {
  const result: AggregatedDayData[] = []
  for (let s = from as number; s <= (to as number); s++) {
    const serial = s as DaySerial
    result.push(
      aggregated.get(serial) ?? {
        serial,
        sales: 0,
        coreSales: 0,
        grossSales: 0,
        discountAbsolute: 0,
        purchaseCost: 0,
        customers: 0,
      },
    )
  }
  return result
}
