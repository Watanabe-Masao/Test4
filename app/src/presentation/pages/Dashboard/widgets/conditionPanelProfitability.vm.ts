/**
 * 粗利率・売変率の ViewModel
 *
 * @guard F7 View は ViewModel のみ受け取る
 */
import type { Store } from '@/domain/models/record'
import type { StoreResult } from '@/domain/models/storeTypes'
import { DISCOUNT_TYPES } from '@/domain/models/record'
import { formatPercent, formatPointDiff } from '@/domain/formatting'
import type { CurrencyFormatter } from '@/presentation/components/charts/chartTheme'
import { calculateShare } from '@/domain/calculations/utils'
import { prorateBudget } from '@/domain/calculations'
import { resolveThresholds, evaluateSignal } from '@/application/rules/conditionResolver'
import type { ConditionSummaryConfig } from '@/domain/models/ConditionConfig'
import {
  type SignalLevel,
  SIGNAL_COLORS,
  computeGpBeforeConsumable,
  computeGpAfterConsumable,
  computeGpAmount,
  computeGpAfterConsumableAmount,
  metricSignal,
} from './conditionSummaryUtils'

// ─── Helpers ────────────────────────────────────────────

/**
 * 粗利予算を経過期間に按分する（domain/calculations/budgetAnalysis.prorateBudget の StoreResult ラッパー）
 *
 * 全期間経過の場合は grossProfitBudget をそのまま返す。
 * 部分期間の場合は日別予算配分に基づいて按分する。
 */
export function prorateGpBudget(
  sr: StoreResult,
  elapsedDays: number | undefined,
  daysInMonth: number | undefined,
): number {
  const dim = daysInMonth ?? 31
  const isPartial = elapsedDays != null && elapsedDays < dim
  if (!isPartial) return sr.grossProfitBudget
  return prorateBudget(sr.grossProfitBudget, sr.budget, sr.budgetDaily, elapsedDays ?? dim)
}

// ─── GP Rate Detail VM ──────────────────────────────────

export interface GpRateStoreRowVm {
  readonly storeId: string
  readonly storeName: string
  readonly sigColor: string
  readonly budgetRate: string
  readonly beforeRate: string
  readonly afterRate: string
  readonly costInclusionRate: string
  readonly diffPointStr: string
  readonly gpBudgetAmt: string
  readonly gpBeforeAmt: string
  readonly gpAfterAmt: string
  readonly diffAmt: number
  readonly diffAmtStr: string
  readonly diffAmtSign: string
}

export interface GpRateTotalVm {
  readonly totalColor: string
  readonly budgetRate: string
  readonly beforeRate: string
  readonly afterRate: string
  readonly costInclusionRate: string
  readonly diffPointStr: string
  readonly gpBudgetAmt: string
  readonly gpBeforeAmt: string
  readonly gpAfterAmt: string
  readonly totalDiffAmt: number
  readonly totalDiffAmtStr: string
  readonly totalDiffAmtSign: string
}

export interface GpRateDetailVm {
  readonly storeRows: readonly GpRateStoreRowVm[]
  readonly total: GpRateTotalVm
}

export function buildGpRateDetailVm(
  sortedStoreEntries: readonly [string, StoreResult][],
  stores: ReadonlyMap<string, Store>,
  result: StoreResult,
  effectiveConfig: ConditionSummaryConfig,
  elapsedDays: number | undefined,
  daysInMonth: number | undefined,
  fmtCurrency: CurrencyFormatter,
): GpRateDetailVm {
  const gpSignal = (diffPt: number, storeId?: string): SignalLevel => {
    const t = resolveThresholds(effectiveConfig, 'gpRate', storeId)
    return evaluateSignal(diffPt, t, 'higher_better')
  }

  const storeRows = sortedStoreEntries.map(([storeId, sr]) => {
    const store = stores.get(storeId)
    const storeName = store?.name ?? storeId
    const before = computeGpBeforeConsumable(sr)
    const after = computeGpAfterConsumable(sr)
    const diff = (after - sr.grossProfitRateBudget) * 100
    const sig = gpSignal(diff, sr.storeId)
    const sigColor = SIGNAL_COLORS[sig]

    const gpAmt = computeGpAmount(sr)
    const gpAfterAmt = computeGpAfterConsumableAmount(sr)
    const storeGpBudget = prorateGpBudget(sr, elapsedDays, daysInMonth)
    const diffAmt = gpAfterAmt - storeGpBudget

    return {
      storeId,
      storeName,
      sigColor,
      budgetRate: formatPercent(sr.grossProfitRateBudget),
      beforeRate: formatPercent(before),
      afterRate: formatPercent(after),
      costInclusionRate: formatPercent(sr.costInclusionRate),
      diffPointStr: formatPointDiff(after - sr.grossProfitRateBudget),
      gpBudgetAmt: fmtCurrency(storeGpBudget),
      gpBeforeAmt: fmtCurrency(gpAmt),
      gpAfterAmt: fmtCurrency(gpAfterAmt),
      diffAmt,
      diffAmtStr: fmtCurrency(diffAmt),
      diffAmtSign: diffAmt >= 0 ? '+' : '',
    }
  })

  const gpBefore = computeGpBeforeConsumable(result)
  const gpAfter = computeGpAfterConsumable(result)
  const gpDiff = (gpAfter - result.grossProfitRateBudget) * 100
  const totalSig = gpSignal(gpDiff)
  const totalColor = SIGNAL_COLORS[totalSig]

  const totalGpAmt = computeGpAmount(result)
  const totalAfterAmt = computeGpAfterConsumableAmount(result)
  const totalGpBudget = prorateGpBudget(result, elapsedDays, daysInMonth)
  const totalDiffAmt = totalAfterAmt - totalGpBudget

  return {
    storeRows,
    total: {
      totalColor,
      budgetRate: formatPercent(result.grossProfitRateBudget),
      beforeRate: formatPercent(gpBefore),
      afterRate: formatPercent(gpAfter),
      costInclusionRate: formatPercent(result.costInclusionRate),
      diffPointStr: formatPointDiff(gpAfter - result.grossProfitRateBudget),
      gpBudgetAmt: fmtCurrency(totalGpBudget),
      gpBeforeAmt: fmtCurrency(totalGpAmt),
      gpAfterAmt: fmtCurrency(totalAfterAmt),
      totalDiffAmt,
      totalDiffAmtStr: fmtCurrency(totalDiffAmt),
      totalDiffAmtSign: totalDiffAmt >= 0 ? '+' : '',
    },
  }
}

// ─── Discount Rate Detail VM ─────────────────────────────

export interface DiscountEntryVm {
  readonly type: string
  readonly rateStr: string
  readonly amtStr: string
}

export interface DiscountStoreRowVm {
  readonly storeId: string
  readonly storeName: string
  readonly sigColor: string
  readonly rateStr: string
  readonly amtStr: string
  readonly entries: readonly DiscountEntryVm[]
}

export interface DiscountTotalVm {
  readonly totalColor: string
  readonly rateStr: string
  readonly amtStr: string
  readonly entries: readonly DiscountEntryVm[]
}

export interface DiscountRateDetailVm {
  readonly storeRows: readonly DiscountStoreRowVm[]
  readonly total: DiscountTotalVm
}

export function buildDiscountRateDetailVm(
  sortedStoreEntries: readonly [string, StoreResult][],
  stores: ReadonlyMap<string, Store>,
  result: StoreResult,
  effectiveConfig: ConditionSummaryConfig,
  fmtCurrency: CurrencyFormatter,
): DiscountRateDetailVm {
  const storeRows = sortedStoreEntries.map(([storeId, sr]) => {
    const store = stores.get(storeId)
    const storeName = store?.name ?? storeId
    const sig = metricSignal(sr.discountRate, 'discountRate', effectiveConfig, sr.storeId)
    const sigColor = SIGNAL_COLORS[sig]

    const entries = DISCOUNT_TYPES.map((dt) => {
      const entry = sr.discountEntries.find((e) => e.type === dt.type)
      const amt = entry?.amount ?? 0
      const rate = sr.grossSales > 0 ? calculateShare(amt, sr.grossSales) : 0
      return { type: dt.type, rateStr: formatPercent(rate), amtStr: fmtCurrency(amt) }
    })

    return {
      storeId,
      storeName,
      sigColor,
      rateStr: formatPercent(sr.discountRate),
      amtStr: fmtCurrency(sr.totalDiscount),
      entries,
    }
  })

  const totalSig = metricSignal(result.discountRate, 'discountRate', effectiveConfig)
  const totalColor = SIGNAL_COLORS[totalSig]
  const totalEntries = DISCOUNT_TYPES.map((dt) => {
    const entry = result.discountEntries.find((e) => e.type === dt.type)
    const amt = entry?.amount ?? 0
    const rate = result.grossSales > 0 ? calculateShare(amt, result.grossSales) : 0
    return { type: dt.type, rateStr: formatPercent(rate), amtStr: fmtCurrency(amt) }
  })

  return {
    storeRows,
    total: {
      totalColor,
      rateStr: formatPercent(result.discountRate),
      amtStr: fmtCurrency(result.totalDiscount),
      entries: totalEntries,
    },
  }
}
