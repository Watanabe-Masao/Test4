/**
 * HourlyChart の pure builder 関数群
 *
 * React hooks を使わない純粋関数。
 * 依存関係が類似する複数の useMemo を 1 関数にまとめる。
 */
import type { CategoryTimeSalesRecord, HourlyWeatherRecord } from '@/domain/models/record'
import type { TimeSlotSeries } from '@/application/hooks/timeSlot/TimeSlotBundle.types'
import { computeSelectedData, buildHourCategoryDetail } from './HourlyChart.logic'
import {
  findCoreTime,
  findTurnaroundHour,
  buildHourlyMap,
} from '@/presentation/components/charts/timeSlotUtils'

// ─── 型定義 ──────────────────────────────────────────

export interface HourlyDataPoint {
  readonly hour: number
  readonly amount: number
  readonly quantity: number
}

export interface HourlyDataSets {
  readonly actualData: readonly HourlyDataPoint[]
  readonly prevData: readonly HourlyDataPoint[]
  readonly allHours: readonly number[]
}

export interface PaddedDataSets {
  readonly paddedData: readonly HourlyDataPoint[]
  readonly paddedRef: readonly HourlyDataPoint[]
}

export interface SelectedDetail {
  readonly selectedData: { amount: number; quantity: number } | null
  readonly hourDetail: readonly {
    dept: string
    line: string
    klass: string
    amount: number
    quantity: number
    pct: number
    color: string
  }[]
}

export interface HourlySummaryStats {
  readonly maxAmt: number
  readonly totalQty: number
  readonly peakHour: HourlyDataPoint
  readonly coreTime: ReturnType<typeof findCoreTime>
  readonly turnaroundHour: ReturnType<typeof findTurnaroundHour>
}

// ─── Builder 関数 ────────────────────────────────────

/**
 * TimeSlotSeries（bundle projection 結果）を hour 別の `{amount, quantity}` 配列に
 * フラット化する。series.entries[].byHour / byHourQuantity を index=hour で
 * 店舗横断で合算し、実在 hour のみを min〜max の範囲でゼロ埋めして返す。
 *
 * series が null / 空のときは空配列を返す（buildHourlyDataSets で合流する）。
 */
export function seriesToHourlyData(series: TimeSlotSeries | null): HourlyDataPoint[] {
  if (!series || series.entries.length === 0) return []
  const map = new Map<number, { amount: number; quantity: number }>()
  for (const entry of series.entries) {
    for (let h = 0; h < entry.byHour.length; h++) {
      const amt = entry.byHour[h]
      const qty = entry.byHourQuantity[h]
      if (amt == null && qty == null) continue
      const prev = map.get(h) ?? { amount: 0, quantity: 0 }
      map.set(h, { amount: prev.amount + (amt ?? 0), quantity: prev.quantity + (qty ?? 0) })
    }
  }
  if (map.size === 0) return []
  const hours = [...map.keys()].sort((a, b) => a - b)
  const minH = hours[0]
  const maxH = hours[hours.length - 1]
  const result: HourlyDataPoint[] = []
  for (let h = minH; h <= maxH; h++) {
    const d = map.get(h)
    result.push({ hour: h, amount: d?.amount ?? 0, quantity: d?.quantity ?? 0 })
  }
  return result
}

/**
 * 当年・前年の時間帯データ + 全時間リストを一括構築する。
 * 入力は `timeSlotLane.bundle` の `currentSeries` / `comparisonSeries`。
 */
export function buildHourlyDataSets(
  currentSeries: TimeSlotSeries | null,
  comparisonSeries: TimeSlotSeries | null,
): HourlyDataSets {
  const actualData = seriesToHourlyData(currentSeries)
  const prevData = seriesToHourlyData(comparisonSeries)

  const hrs = new Set<number>()
  for (const d of actualData) hrs.add(d.hour)
  for (const d of prevData) hrs.add(d.hour)
  const allHours = [...hrs].sort((a, b) => a - b)

  return { actualData, prevData, allHours }
}

/**
 * hourlyData と refData を allHours で pad した配列を一括構築する。
 * paddedData + paddedRef の 2 useMemo を統合。
 */
export function buildPaddedDataSets(
  hourlyData: readonly { hour: number; amount: number; quantity: number }[],
  refData: readonly { hour: number; amount: number; quantity: number }[],
  allHours: readonly number[],
): PaddedDataSets {
  const hourlyMap = new Map(hourlyData.map((d) => [d.hour, d]))
  const refMap = new Map(refData.map((d) => [d.hour, d]))
  const zero = { hour: 0, amount: 0, quantity: 0 }

  const paddedData = allHours.map((h) => hourlyMap.get(h) ?? { ...zero, hour: h })
  const paddedRef = allHours.map((h) => refMap.get(h) ?? { ...zero, hour: h })

  return { paddedData, paddedRef }
}

/**
 * 選択時間帯の集計データ + カテゴリ詳細を一括構築する。
 * selectedData + hourDetail の 2 useMemo を統合。
 */
export function buildSelectedDetail(
  selectedHours: Set<number>,
  paddedData: readonly { hour: number; amount: number; quantity: number }[],
  dayRecords: readonly CategoryTimeSalesRecord[],
  prevDayRecords: readonly CategoryTimeSalesRecord[],
  hourlyMode: 'actual' | 'prev',
): SelectedDetail {
  const selectedData = computeSelectedData(selectedHours, paddedData)
  const hourDetail = buildHourCategoryDetail(selectedHours, dayRecords, prevDayRecords, hourlyMode)
  return { selectedData, hourDetail }
}

/**
 * 天気データの hour→record マップを構築する。
 */
export function buildWeatherHourlyMap(
  weatherHourly: readonly HourlyWeatherRecord[] | undefined,
): Map<number, HourlyWeatherRecord> | null {
  if (!weatherHourly || weatherHourly.length === 0) return null
  const m = new Map<number, HourlyWeatherRecord>()
  for (const w of weatherHourly) m.set(w.hour, w)
  return m
}

/**
 * paddedData から JSX 描画に必要な集約系派生値を一括構築する。
 * maxAmt / totalQty / peakHour / hourlyMap / coreTime / turnaroundHour を
 * 1 関数で返すことで、HourlyChart.tsx 側の宣言を 9 行 → 2 行に圧縮する。
 *
 * 注意: totalAmt は cumData (HourlyChart.logic) の事前依存となるため
 *       本関数には含めない (呼び出し側で別途計算)。
 */
export function buildHourlySummaryStats(
  paddedData: readonly HourlyDataPoint[],
): HourlySummaryStats {
  const maxAmt = Math.max(...paddedData.map((d) => d.amount), 1)
  const totalQty = paddedData.reduce((s, d) => s + d.quantity, 0)
  const peakHour = paddedData.reduce(
    (peak, d) => (d.amount > peak.amount ? d : peak),
    paddedData[0],
  )
  const hourlyMap = buildHourlyMap(paddedData)
  const coreTime = findCoreTime(hourlyMap)
  const turnaroundHour = findTurnaroundHour(hourlyMap)
  return { maxAmt, totalQty, peakHour, coreTime, turnaroundHour }
}

/**
 * 選択時間帯のラベル文字列を整形する (1〜3 件: ・区切り / 4 件以上: 範囲表記)。
 * HourlyChart.tsx 側の宣言を 7 行 → 1 行に圧縮する。
 */
export function formatSelectedHoursLabel(selectedHours: ReadonlySet<number>): string {
  if (selectedHours.size === 0) return ''
  const sorted = [...selectedHours].sort((a, b) => a - b)
  if (selectedHours.size <= 3) {
    return sorted.map((h) => `${h}時`).join('・')
  }
  return `${sorted[0]}時〜${sorted[sorted.length - 1]}時 (${selectedHours.size}時間)`
}
