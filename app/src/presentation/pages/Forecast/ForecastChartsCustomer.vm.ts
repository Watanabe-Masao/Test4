/**
 * ForecastChartsCustomer ViewModel
 *
 * チャートコンポーネントから data transformation / 計算ロジックを分離する。
 * React / styled-components に依存しない純粋関数群。
 *
 * @guard F7 View は ViewModel のみ受け取る
 *
 * @responsibility R:unclassified
 */
import {
  DOW_LABELS,
  type DowCustomerAvg,
  type MovingAvgEntry,
  type DailyCustomerEntry,
  type RelationshipEntry,
} from './ForecastPage.helpers'

// ─── 出力型 ──────────────────────────────────────────

export interface DowCustomerChartDataPoint {
  readonly name: string
  readonly 今年客数: number
  readonly 前年客数?: number
  readonly 今年客単価: number
  readonly 前年客単価?: number
  readonly color: string
}

export interface DowCustomerChartViewModel {
  readonly data: DowCustomerChartDataPoint[]
  readonly hasPrev: boolean
}

export interface MovingAverageChartDataPoint {
  readonly day: string
  readonly 客数MA: number
  readonly 客単価MA: number
  readonly 前年客数MA?: number
  readonly 前年客単価MA?: number
}

export interface RelationshipChartDataPoint {
  readonly day: string
  readonly 売上指数?: number
  readonly 客数指数?: number
  readonly 客単価指数?: number
  readonly 前年売上指数?: number
  readonly 前年客数指数?: number
  readonly 前年客単価指数?: number
}

export interface RelationshipChartViewModel {
  readonly chartData: RelationshipChartDataPoint[]
  readonly title: string
  readonly showCurrent: boolean
  readonly showPrev: boolean
}

export interface CustomerSalesScatterDataPoint {
  readonly day: string
  readonly 売上: number
  readonly 客数: number
  readonly 客単価: number
}

export interface SameDowComparisonDataPoint {
  readonly day: string
  readonly 今年客数: number
  readonly 前年客数: number
  readonly 今年客単価: number
  readonly 前年客単価: number
  readonly color: string
}

// ─── ViewModel 構築 ──────────────────────────────────

/** 曜日別客数・客単価チャートの描画データを構築する */
export function buildDowCustomerChartViewModel(
  averages: readonly DowCustomerAvg[],
  dowColors: readonly string[],
): DowCustomerChartViewModel {
  const hasPrev = averages.some((a) => a.prevAvgCustomers > 0)

  const data: DowCustomerChartDataPoint[] = averages.map((a, i) => ({
    name: a.dow,
    今年客数: a.avgCustomers,
    ...(hasPrev ? { 前年客数: a.prevAvgCustomers } : {}),
    今年客単価: a.avgTxValue,
    ...(hasPrev ? { 前年客単価: a.prevAvgTxValue } : {}),
    color: dowColors[i],
  }))

  return { data, hasPrev }
}

/** 移動平均チャートの描画データを構築する */
export function buildMovingAverageChartData(
  maData: readonly MovingAvgEntry[],
  hasPrev: boolean,
): MovingAverageChartDataPoint[] {
  return maData.map((e) => ({
    day: `${e.day}`,
    客数MA: e.customersMA,
    客単価MA: e.txValueMA,
    ...(hasPrev ? { 前年客数MA: e.prevCustomersMA, 前年客単価MA: e.prevTxValueMA } : {}),
  }))
}

/** 関係性チャートの描画データとタイトルを構築する */
export function buildRelationshipChartViewModel(
  relData: readonly RelationshipEntry[],
  prevData: readonly RelationshipEntry[],
  viewMode: 'current' | 'prev' | 'compare',
): RelationshipChartViewModel {
  const showCurrent = viewMode === 'current' || viewMode === 'compare'
  const showPrev = (viewMode === 'prev' || viewMode === 'compare') && prevData.length > 0

  const dayMap = new Map<number, Record<string, number | string>>()
  if (showCurrent) {
    for (const e of relData) {
      dayMap.set(e.day, {
        day: `${e.day}`,
        売上指数: Math.round(e.salesIndex * 100),
        客数指数: Math.round(e.customersIndex * 100),
        客単価指数: Math.round(e.txValueIndex * 100),
      })
    }
  }
  if (showPrev) {
    for (const e of prevData) {
      const existing = dayMap.get(e.day) ?? { day: `${e.day}` }
      dayMap.set(e.day, {
        ...existing,
        前年売上指数: Math.round(e.salesIndex * 100),
        前年客数指数: Math.round(e.customersIndex * 100),
        前年客単価指数: Math.round(e.txValueIndex * 100),
      })
    }
  }
  const chartData = [...dayMap.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, v]) => v) as unknown as RelationshipChartDataPoint[]

  const title =
    viewMode === 'compare'
      ? '売上・客数・客単価 関係性推移（今年 vs 前年）'
      : viewMode === 'prev'
        ? '売上・客数・客単価 関係性推移（前年）'
        : '売上・客数・客単価 関係性推移（今年）'

  return { chartData, title, showCurrent, showPrev }
}

/** 日別客数・売上散布図的チャートの描画データを構築する */
export function buildCustomerSalesScatterData(
  data: readonly DailyCustomerEntry[],
): CustomerSalesScatterDataPoint[] {
  return data
    .filter((e) => e.customers > 0)
    .map((e) => ({
      day: `${e.day}`,
      売上: e.sales,
      客数: e.customers,
      客単価: e.txValue,
    }))
}

/** 同曜日比較チャートの描画データを構築する */
export function buildSameDowComparisonData(
  entries: readonly DailyCustomerEntry[],
  year: number,
  month: number,
  dowColors: readonly string[],
): SameDowComparisonDataPoint[] {
  return entries
    .filter((e) => e.customers > 0 && e.prevCustomers > 0)
    .map((e) => {
      const dow = new Date(year, month - 1, e.day).getDay()
      return {
        day: `${e.day}(${DOW_LABELS[dow]})`,
        今年客数: e.customers,
        前年客数: e.prevCustomers,
        今年客単価: e.txValue,
        前年客単価: e.prevTxValue,
        color: dowColors[dow],
      }
    })
}
