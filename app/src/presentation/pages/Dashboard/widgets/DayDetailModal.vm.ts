/**
 * DayDetailModal ViewModel
 *
 * 純粋なデータ変換・計算ロジック。React / styled-components に依存しない。
 * DayDetailModal.tsx はこのモジュールから関数・型をインポートして描画のみを行う。
 *
 * @guard F7 View は ViewModel のみ受け取る
 */
import { formatCurrency, formatPercent } from '@/domain/formatting'
import {
  calculateAchievementRate,
  calculateYoYRatio,
  calculateShare,
  calculateTransactionValue,
} from '@/domain/calculations/utils'
import type { DailyRecord } from '@/domain/models/record'
import { toDateKeyFromParts } from '@/domain/models/CalendarDate'
import type { PrevYearData } from '@/application/hooks/analytics'

// ── Re-exported types ──

export type ModalTab = 'sales' | 'hourly' | 'breakdown'
export type CompMode = 'yoy' | 'wow'

// ── Constants ──

export const DOW_NAMES = ['日', '月', '火', '水', '木', '金', '土'] as const

// ── Core Metrics ──

export interface CoreMetrics {
  readonly actual: number
  readonly diff: number
  readonly ach: number
  readonly cumDiff: number
  readonly cumAch: number
  readonly pySales: number
  readonly pyRatio: number
  readonly dayOfWeek: string
}

export function computeCoreMetrics(
  record: DailyRecord | undefined,
  budget: number,
  cumBudget: number,
  cumSales: number,
  prevYear: PrevYearData,
  day: number,
  month: number,
  year: number,
): CoreMetrics {
  const actual = record?.sales ?? 0
  const diff = actual - budget
  const ach_pragmatic = calculateAchievementRate(actual, budget)
  const cumDiff = cumSales - cumBudget
  const cumAch_pragmatic = calculateAchievementRate(cumSales, cumBudget)
  const pySales = prevYear.daily.get(toDateKeyFromParts(year, month, day))?.sales ?? 0
  const pyRatio_pragmatic = calculateYoYRatio(actual, pySales)
  const dayOfWeek = DOW_NAMES[new Date(year, month - 1, day).getDay()]

  return {
    actual,
    diff,
    ach: ach_pragmatic,
    cumDiff,
    cumAch: cumAch_pragmatic,
    pySales,
    pyRatio: pyRatio_pragmatic,
    dayOfWeek,
  }
}

// ── Customer Metrics ──

export interface CustomerMetrics {
  readonly dayCust: number
  readonly dayTxVal: number
  readonly pyCust: number
  readonly pyTxVal: number
  readonly cumTxVal: number
  readonly cumPrevTxVal: number
  readonly custRatio: number
  readonly txValRatio: number
}

export function computeCustomerMetrics(
  record: DailyRecord | undefined,
  actual: number,
  pySales: number,
  prevYear: PrevYearData,
  day: number,
  cumSales: number,
  cumCustomers: number,
  cumPrevYear: number,
  cumPrevCustomers: number,
  year: number,
  month: number,
): CustomerMetrics {
  const dayCust = record?.customers ?? 0
  const dayTxVal = calculateTransactionValue(actual, dayCust)
  const pyCust = prevYear.daily.get(toDateKeyFromParts(year, month, day))?.customers ?? 0
  const pyTxVal = calculateTransactionValue(pySales, pyCust)
  const cumTxVal = calculateTransactionValue(cumSales, cumCustomers)
  const cumPrevTxVal = calculateTransactionValue(cumPrevYear, cumPrevCustomers)
  const custRatio_pragmatic = calculateYoYRatio(dayCust, pyCust)
  const txValRatio_pragmatic = calculateYoYRatio(dayTxVal, pyTxVal)

  return {
    dayCust,
    dayTxVal,
    pyCust,
    pyTxVal,
    cumTxVal,
    cumPrevTxVal,
    custRatio: custRatio_pragmatic,
    txValRatio: txValRatio_pragmatic,
  }
}

// ── WoW (Week-over-Week) ──

export interface WowMetrics {
  readonly wowPrevDay: number
  readonly canWoW: boolean
  readonly wowPrevSales: number
  readonly wowPrevCust: number
}

export function computeWowMetrics(
  day: number,
  dailyMap: ReadonlyMap<number, DailyRecord> | undefined,
): WowMetrics {
  const wowPrevDay = day - 7
  const canWoW = wowPrevDay >= 1
  const wowDailyRecord = canWoW && dailyMap ? dailyMap.get(wowPrevDay) : undefined
  const wowPrevSales = wowDailyRecord?.sales ?? 0
  const wowPrevCust = wowDailyRecord?.customers ?? 0

  return { wowPrevDay, canWoW, wowPrevSales, wowPrevCust }
}

// ── Comparison mode resolution ──

export function resolveActiveCompMode(compMode: CompMode, canWoW: boolean): CompMode {
  return compMode === 'wow' && !canWoW ? 'yoy' : compMode
}

export interface ComparisonLabels {
  readonly compSales: number
  readonly compCust: number
  readonly compLabel: string
  readonly curCompLabel: string
}

export function computeComparisonLabels(
  activeCompMode: CompMode,
  day: number,
  wowPrevDay: number,
  wowPrevSales: number,
  wowPrevCust: number,
  pySales: number,
  pyCust: number,
): ComparisonLabels {
  const compSales = activeCompMode === 'wow' ? wowPrevSales : pySales
  const compCust = activeCompMode === 'wow' ? wowPrevCust : pyCust
  const compLabel = activeCompMode === 'wow' ? `${wowPrevDay}日` : '前年'
  const curCompLabel = activeCompMode === 'wow' ? `${day}日` : '当年'

  return { compSales, compCust, compLabel, curCompLabel }
}

// ── Breakdown (仕入内訳) ──

export interface CostItem {
  readonly label: string
  readonly cost: number
  readonly price: number
}

export interface BreakdownViewModel {
  readonly costItems: readonly CostItem[]
  readonly totalPrice: number
  readonly totalCost: number
}

export function computeBreakdown(record: DailyRecord): BreakdownViewModel {
  const totalCost = record.totalCost
  const costItems: CostItem[] = [
    { label: '仕入（在庫）', cost: record.purchase.cost, price: record.purchase.price },
    { label: '花', cost: record.flowers.cost, price: record.flowers.price },
    { label: '産直', cost: record.directProduce.cost, price: record.directProduce.price },
    { label: '店間入', cost: record.interStoreIn.cost, price: record.interStoreIn.price },
    { label: '店間出', cost: record.interStoreOut.cost, price: record.interStoreOut.price },
    {
      label: '部門間入',
      cost: record.interDepartmentIn.cost,
      price: record.interDepartmentIn.price,
    },
    {
      label: '部門間出',
      cost: record.interDepartmentOut.cost,
      price: record.interDepartmentOut.price,
    },
  ].filter((item) => item.cost !== 0 || item.price !== 0)

  const totalPrice = costItems.reduce((sum, item) => sum + Math.abs(item.price), 0)

  return { costItems, totalPrice, totalCost }
}

export function computeCostItemRatio(item: CostItem, totalPrice: number): number {
  return calculateShare(Math.abs(item.price), totalPrice)
}

// ── Formatting helpers (delegate to domain, keep VM as single import point) ──

export { formatCurrency, formatPercent }
