/**
 * 客単価・日販達成率・日別YoY描画の ViewModel
 *
 * @guard F7 View は ViewModel のみ受け取る
 */
import type { Store } from '@/domain/models/record'
import type { StoreResult } from '@/domain/models/storeTypes'
import { formatPercent } from '@/domain/formatting'
import type { CurrencyFormatter } from '@/presentation/components/charts/chartTheme'
import {
  safeDivide,
  calculateAchievementRate,
  calculateTransactionValue,
  calculateYoYRatio,
} from '@/domain/calculations/utils'
import type { ConditionSummaryConfig } from '@/domain/models/ConditionConfig'
import { SIGNAL_COLORS, metricSignal } from './conditionSummaryUtils'
import type { DailyYoYRow } from './conditionPanelYoY.vm'

// ─── Tx Value Detail VM ─────────────────────────────────

export function formatTxValue(v: number): string {
  return `${v.toLocaleString('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}円`
}

export interface TxValueStoreRowVm {
  readonly storeId: string
  readonly storeName: string
  readonly salesStr: string
  readonly customersStr: string
  readonly txStr: string
  readonly dailyRows: readonly TxValueDailyRowVm[]
}

export interface TxValueDailyRowVm {
  readonly day: number
  readonly dayLabel: string
  readonly salesStr: string
  readonly customersStr: string
  readonly txStr: string
}

export interface TxValueDetailVm {
  readonly storeRows: readonly TxValueStoreRowVm[]
  readonly totalSalesStr: string
  readonly totalCustStr: string
  readonly totalTxStr: string
}

export function buildTxValueDetailVm(
  sortedStoreEntries: readonly [string, StoreResult][],
  stores: ReadonlyMap<string, Store>,
  result: StoreResult,
  fmtCurrency: CurrencyFormatter,
  storeCustomerMap?: ReadonlyMap<string, number>,
  grandTotalCustomers?: number,
): TxValueDetailVm {
  const storeRows = sortedStoreEntries.map(([storeId, sr]) => {
    const store = stores.get(storeId)
    const storeName = store?.name ?? storeId
    const storeCustomers = storeCustomerMap?.get(storeId) ?? 0
    const storeTx =
      storeCustomers > 0
        ? calculateTransactionValue(sr.totalSales, storeCustomers)
        : sr.transactionValue

    const days = [...sr.daily.entries()].sort(([a], [b]) => a - b)
    const dailyRows = days.map(([day, dr]) => {
      const customers = dr.customers ?? 0
      const dayTx = calculateTransactionValue(dr.sales, customers)
      return {
        day,
        dayLabel: `${day}日`,
        salesStr: fmtCurrency(dr.sales),
        customersStr: `${customers.toLocaleString()}人`,
        txStr: formatTxValue(dayTx),
      }
    })

    return {
      storeId,
      storeName,
      salesStr: fmtCurrency(sr.totalSales),
      customersStr: `${storeCustomers.toLocaleString()}人`,
      txStr: formatTxValue(storeTx),
      dailyRows,
    }
  })

  const totalCust = grandTotalCustomers ?? 0
  return {
    storeRows,
    totalSalesStr: fmtCurrency(result.totalSales),
    totalCustStr: `${totalCust.toLocaleString()}人`,
    totalTxStr: formatTxValue(
      totalCust > 0
        ? calculateTransactionValue(result.totalSales, totalCust)
        : result.transactionValue,
    ),
  }
}

// ─── Daily Sales Detail VM ──────────────────────────────

export interface DailySalesStoreRowVm {
  readonly storeId: string
  readonly storeName: string
  readonly sigColor: string
  readonly salesStr: string
  readonly budgetStr: string
  readonly achievementStr: string
  readonly dailySalesStr: string
  readonly budgetDailyStr: string
  readonly hasBudget: boolean
  readonly dailyBreakdown: readonly DailySalesDayVm[]
}

export interface DailySalesDayVm {
  readonly day: number
  readonly dayLabel: string
  readonly salesStr: string
  readonly budgetStr: string
  readonly rateStr: string
  readonly hasRate: boolean
}

export interface DailySalesDetailVm {
  readonly storeRows: readonly DailySalesStoreRowVm[]
  readonly totalSalesStr: string
  readonly totalBudgetStr: string
  readonly totalAchievementStr: string
  readonly totalDailySalesStr: string
  readonly totalBudgetDailyStr: string
  readonly totalColor: string
  readonly hasTotalBudget: boolean
}

export function buildDailySalesDetailVm(
  sortedStoreEntries: readonly [string, StoreResult][],
  stores: ReadonlyMap<string, Store>,
  result: StoreResult,
  effectiveConfig: ConditionSummaryConfig,
  daysInMonth: number,
  fmtCurrency: CurrencyFormatter,
): DailySalesDetailVm {
  const budgetDailyAvg = safeDivide(result.budget, daysInMonth, 0)
  const dailyRatio = calculateAchievementRate(result.averageDailySales, budgetDailyAvg)
  const totalSig = metricSignal(dailyRatio, 'dailySales', effectiveConfig)
  const totalColor = SIGNAL_COLORS[totalSig]

  const storeRows = sortedStoreEntries.map(([storeId, sr]) => {
    const store = stores.get(storeId)
    const storeName = store?.name ?? storeId
    const storeBudgetDaily = safeDivide(sr.budget, daysInMonth, 0)
    const storeRatio = calculateAchievementRate(sr.averageDailySales, storeBudgetDaily)
    const achievementRate_pragmatic = calculateAchievementRate(sr.totalSales, sr.budget)
    const sig =
      storeBudgetDaily > 0
        ? metricSignal(storeRatio, 'dailySales', effectiveConfig, sr.storeId)
        : 'blue'
    const sigColor = SIGNAL_COLORS[sig]

    const days = [...sr.daily.entries()].sort(([a], [b]) => a - b)
    let cumSales = 0
    let cumBudget = 0
    const dailyBreakdown = days.map(([day, dr]) => {
      const dayBudget = sr.budgetDaily.get(day) ?? 0
      cumSales += dr.sales
      cumBudget += dayBudget
      const dayRate_pragmatic = calculateAchievementRate(cumSales, cumBudget)
      return {
        day,
        dayLabel: `${day}日`,
        salesStr: fmtCurrency(dr.sales),
        budgetStr: fmtCurrency(dayBudget),
        rateStr: cumBudget > 0 ? formatPercent(dayRate_pragmatic, 2) : '—',
        hasRate: cumBudget > 0,
      }
    })

    return {
      storeId,
      storeName,
      sigColor,
      salesStr: fmtCurrency(sr.totalSales),
      budgetStr: fmtCurrency(sr.budget),
      achievementStr: sr.budget > 0 ? formatPercent(achievementRate_pragmatic, 2) : '—',
      dailySalesStr: fmtCurrency(sr.averageDailySales),
      budgetDailyStr: fmtCurrency(storeBudgetDaily),
      hasBudget: sr.budget > 0,
      dailyBreakdown,
    }
  })

  return {
    storeRows,
    totalSalesStr: fmtCurrency(result.totalSales),
    totalBudgetStr: fmtCurrency(result.budget),
    totalAchievementStr:
      result.budget > 0
        ? formatPercent(calculateAchievementRate(result.totalSales, result.budget), 2)
        : '—',
    totalDailySalesStr: fmtCurrency(result.averageDailySales),
    totalBudgetDailyStr: fmtCurrency(budgetDailyAvg),
    totalColor,
    hasTotalBudget: result.budget > 0,
  }
}

// ─── Daily YoY Render Data VM ───────────────────────────

export interface DailyYoYRenderRow {
  readonly day: number
  readonly dayLabel: string
  readonly currentStr: string
  readonly prevStr: string
  readonly yoyStr: string
  readonly hasPrev: boolean
}

export function buildDailyYoYRenderRows(
  rows: readonly DailyYoYRow[],
  mode: 'cumulative' | 'daily',
  metric: 'sales' | 'customers',
  fmtCurrency: CurrencyFormatter,
): DailyYoYRenderRow[] {
  let cumCurrent = 0
  let cumPrev = 0

  return rows.map((row) => {
    const currentVal = metric === 'sales' ? row.currentSales : row.currentCustomers
    const prevVal = metric === 'sales' ? row.prevSales : row.prevCustomers
    cumCurrent += currentVal
    cumPrev += prevVal

    const displayCurrent = mode === 'cumulative' ? cumCurrent : currentVal
    const displayPrev = mode === 'cumulative' ? cumPrev : prevVal
    const yoy = calculateYoYRatio(displayCurrent, displayPrev)

    const fmtVal =
      metric === 'sales' ? (v: number) => fmtCurrency(v) : (v: number) => `${v.toLocaleString()}人`

    return {
      day: row.day,
      dayLabel: `${row.day}日`,
      currentStr: fmtVal(displayCurrent),
      prevStr: displayPrev > 0 ? fmtVal(displayPrev) : '—',
      yoyStr: displayPrev > 0 ? formatPercent(yoy, 2) : '—',
      hasPrev: displayPrev > 0,
    }
  })
}
