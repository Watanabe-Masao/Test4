/**
 * コンディションサマリー強化版 — 日別詳細ビルダー
 *
 * @guard F7 View は ViewModel のみ受け取る
 */

import {
  safeDivide,
  calculateAchievementRate,
  calculateYoYRatio,
} from '@/domain/calculations/utils'
import { calculateMarkupRates } from '@/domain/calculations/markupRate'
import { calculateDiscountRate } from '@/domain/calculations/estMethod'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { PrevYearMonthlyKpi } from '@/application/hooks/analytics'
import type { MetricKey } from './conditionSummaryTypes'
import { markupRateFromAmounts } from './conditionSummaryHelpers'

// ─── Daily Modal Data ───────────────────────────────────

export interface DailyDetailRow {
  readonly day: number
  readonly budget: number
  readonly actual: number
  readonly diff: number
  readonly achievement: number
  readonly cumBudget: number
  readonly cumActual: number
  readonly cumDiff: number
  readonly cumAchievement: number
}

/** 日別モーダルの前年比行 */
export interface DailyYoYRow {
  readonly day: number
  readonly prevActual: number
  readonly curActual: number
  readonly yoy: number
}

/** 店舗の日別詳細データを構築する（売上・粗利額用） */
export function buildDailyDetailRows(
  sr: StoreResult,
  metric: MetricKey,
  elapsedDays: number,
  daysInMonth: number,
): readonly DailyDetailRow[] {
  const effectiveElapsed = elapsedDays ?? daysInMonth

  // GP: 日別は推定法（sales - totalCost - costInclusion）で計算するが、
  // 店別行は在庫法（invMethodGrossProfit）を使うため差異が出る。
  // 在庫法の調整額を各日に按分し、累計が店別行の値と一致するようにする。
  if (metric === 'gp') {
    return buildGpDailyRows(sr, effectiveElapsed)
  }

  const rows: DailyDetailRow[] = []
  let cumBudget = 0
  let cumActual = 0

  for (let day = 1; day <= effectiveElapsed; day++) {
    let dailyBudget: number
    let dailyActual: number

    if (metric === 'sales') {
      dailyBudget = sr.budgetDaily.get(day) ?? 0
      dailyActual = sr.daily.get(day)?.sales ?? 0
    } else {
      // Rate metrics: use daily rate values
      const dailyRecord = sr.daily.get(day)
      if (!dailyRecord) {
        rows.push({
          day,
          budget: 0,
          actual: 0,
          diff: 0,
          achievement: 0,
          cumBudget: cumBudget,
          cumActual: cumActual,
          cumDiff: cumActual - cumBudget,
          cumAchievement: 0,
        })
        continue
      }
      if (metric === 'markupRate') {
        dailyBudget = sr.grossProfitRateBudget * 100
        // domain/calculations/markupRate の calculateMarkupRates を使用
        const { averageMarkupRate } = calculateMarkupRates({
          purchasePrice: dailyRecord.purchase.price,
          purchaseCost: dailyRecord.purchase.cost,
          deliveryPrice: dailyRecord.flowers.price + dailyRecord.directProduce.price,
          deliveryCost: dailyRecord.flowers.cost + dailyRecord.directProduce.cost,
          transferPrice:
            dailyRecord.interStoreIn.price +
            dailyRecord.interStoreOut.price +
            dailyRecord.interDepartmentIn.price +
            dailyRecord.interDepartmentOut.price,
          transferCost:
            dailyRecord.interStoreIn.cost +
            dailyRecord.interStoreOut.cost +
            dailyRecord.interDepartmentIn.cost +
            dailyRecord.interDepartmentOut.cost,
          defaultMarkupRate: 0,
        })
        dailyActual = averageMarkupRate * 100
      } else if (metric === 'discountRate') {
        dailyBudget = 0
        // domain/calculations/estMethod の calculateDiscountRate を使用
        dailyActual = calculateDiscountRate(dailyRecord.sales, dailyRecord.discountAbsolute) * 100
      } else if (metric === 'gpRate') {
        dailyBudget = sr.grossProfitRateBudget * 100
        dailyActual =
          dailyRecord.sales > 0
            ? ((dailyRecord.sales - dailyRecord.totalCost - dailyRecord.costInclusion.cost) /
                dailyRecord.sales) *
              100
            : 0
      } else {
        dailyBudget = 0
        dailyActual = 0
      }
    }

    cumBudget += dailyBudget
    cumActual += dailyActual

    const diff = dailyActual - dailyBudget
    const achievement =
      metric === 'markupRate'
        ? dailyActual - dailyBudget
        : dailyBudget > 0
          ? calculateAchievementRate(dailyActual, dailyBudget) * 100
          : 0
    const cumDiff = cumActual - cumBudget
    const cumAchievement =
      metric === 'markupRate'
        ? cumBudget > 0
          ? safeDivide(cumActual, effectiveElapsed > 0 ? day : 1, 0) -
            sr.grossProfitRateBudget * 100
          : 0
        : cumBudget > 0
          ? calculateAchievementRate(cumActual, cumBudget) * 100
          : 0

    rows.push({
      day,
      budget: dailyBudget,
      actual: dailyActual,
      diff,
      achievement,
      cumBudget,
      cumActual,
      cumDiff,
      cumAchievement,
    })
  }
  return rows
}

/**
 * GP 日別行を構築する。
 *
 * 在庫法と推定法を明確に分けて計算する。
 *
 * 【在庫法】invMethodGrossProfitRate が有効な場合:
 *   dailyGP = dailySales × invMethodGrossProfitRate - dailyCostInclusion
 *   → 在庫法の粗利率を日別売上に一律適用し、原価算入費を控除
 *   → 累計 = invMethodGrossProfit - totalCostInclusion（店別行と一致）
 *
 * 【推定法】invMethodGrossProfitRate が null の場合:
 *   dailyGP = dailyCoreSales × estMethodMarginRate
 *   → 推定法マージン率をコア売上に適用（COGS に原価算入費が既に含まれる）
 *   → 累計 = estMethodMargin（店別行と一致）
 */
function buildGpDailyRows(sr: StoreResult, effectiveElapsed: number): DailyDetailRow[] {
  const useInvMethod = sr.invMethodGrossProfitRate != null
  const gpRate = useInvMethod ? sr.invMethodGrossProfitRate! : sr.estMethodMarginRate

  const rows: DailyDetailRow[] = []
  let cumBudget = 0
  let cumActual = 0

  for (let day = 1; day <= effectiveElapsed; day++) {
    const salesBudgetDay = sr.budgetDaily.get(day) ?? 0
    const dailyBudget = sr.budget > 0 ? sr.grossProfitBudget * (salesBudgetDay / sr.budget) : 0
    const dailyRecord = sr.daily.get(day)

    let dailyActual: number
    if (!dailyRecord) {
      dailyActual = 0
    } else if (useInvMethod) {
      // 在庫法: 粗利率を売上に適用 → 原価算入費を別途控除
      dailyActual = dailyRecord.sales * gpRate - dailyRecord.costInclusion.cost
    } else {
      // 推定法: マージン率をコア売上に適用（原価算入費はレートに含まれる）
      dailyActual = dailyRecord.coreSales * gpRate
    }

    cumBudget += dailyBudget
    cumActual += dailyActual

    const diff = dailyActual - dailyBudget
    const achievement =
      dailyBudget > 0 ? calculateAchievementRate(dailyActual, dailyBudget) * 100 : 0
    const cumDiff = cumActual - cumBudget
    const cumAchievement = cumBudget > 0 ? calculateAchievementRate(cumActual, cumBudget) * 100 : 0

    rows.push({
      day,
      budget: dailyBudget,
      actual: dailyActual,
      diff,
      achievement,
      cumBudget,
      cumActual,
      cumDiff,
      cumAchievement,
    })
  }

  return rows
}

/** 店舗の日別前年比データを構築する（storeContributions ベース） */
export function buildDailyYoYRows(
  sr: StoreResult,
  storeId: string,
  prevYearMonthlyKpi: PrevYearMonthlyKpi,
  elapsedDays: number,
  daysInMonth: number,
): readonly DailyYoYRow[] {
  if (!prevYearMonthlyKpi.hasPrevYear) return []
  const effectiveElapsed = elapsedDays ?? daysInMonth

  // storeContributions から storeId × mappedDay でインデックス化
  const prevByDay = new Map<number, number>()
  for (const c of prevYearMonthlyKpi.sameDow.storeContributions) {
    if (c.storeId === storeId) {
      prevByDay.set(c.mappedDay, (prevByDay.get(c.mappedDay) ?? 0) + c.sales)
    }
  }

  const rows: DailyYoYRow[] = []
  for (let day = 1; day <= effectiveElapsed; day++) {
    const curActual = sr.daily.get(day)?.sales ?? 0
    const prevActual = prevByDay.get(day) ?? 0
    const yoy = prevActual > 0 ? calculateYoYRatio(curActual, prevActual) * 100 : 0
    rows.push({ day, prevActual, curActual, yoy })
  }
  return rows
}

/** 日別売変種別内訳行 */
export interface DailyDiscountRow {
  readonly day: number
  readonly totalRate: number
  /** 種別別金額 (71/72/73/74 順) */
  readonly entries: readonly { readonly type: string; readonly amount: number }[]
  readonly totalAmount: number
}

/** 店舗の日別売変種別内訳を構築する */
export function buildDailyDiscountRows(
  sr: StoreResult,
  elapsedDays: number,
  daysInMonth: number,
): readonly DailyDiscountRow[] {
  const effectiveElapsed = elapsedDays ?? daysInMonth
  const rows: DailyDiscountRow[] = []

  for (let day = 1; day <= effectiveElapsed; day++) {
    const dailyRecord = sr.daily.get(day)
    if (!dailyRecord) {
      rows.push({ day, totalRate: 0, entries: [], totalAmount: 0 })
      continue
    }

    const totalRate = calculateDiscountRate(dailyRecord.sales, dailyRecord.discountAbsolute) * 100

    const entries = dailyRecord.discountEntries.map((e) => ({
      type: e.type,
      amount: e.amount,
    }))

    rows.push({ day, totalRate, entries, totalAmount: dailyRecord.discountAbsolute })
  }
  return rows
}

// ─── Daily Discount Rate YoY ────────────────────────────

/** 日別売変率前年比行（日別 + 累計） */
export interface DailyDiscountRateYoYRow {
  readonly day: number
  /** 当年日別売変率 (×100済) */
  readonly curRate: number
  /** 前年日別売変率 (×100済) */
  readonly prevRate: number
  /** 日別差異 (pp) */
  readonly diff: number
  /** 当年累計売変率 (×100済) */
  readonly cumCurRate: number
  /** 前年累計売変率 (×100済) */
  readonly cumPrevRate: number
  /** 累計差異 (pp) */
  readonly cumDiff: number
}

/**
 * 店舗の日別売変率前年比を構築する（storeContributions ベース）
 *
 * storeContributions から前年の sales + discount を日別に集約し、
 * discount / (sales + discount) × 100 で前年売変率を算出する。
 * 累計は sales/discount の running total から率を再計算する（率の単純平均ではない）。
 */
export function buildDailyDiscountRateYoYRows(
  sr: StoreResult,
  storeId: string,
  prevYearMonthlyKpi: PrevYearMonthlyKpi,
  elapsedDays: number,
  daysInMonth: number,
): readonly DailyDiscountRateYoYRow[] {
  if (!prevYearMonthlyKpi.hasPrevYear) return []
  const effectiveElapsed = elapsedDays ?? daysInMonth

  // 前年: storeContributions から mappedDay 別に sales + discount を集約
  const prevByDay = new Map<number, { sales: number; discount: number }>()
  for (const c of prevYearMonthlyKpi.sameDow.storeContributions) {
    if (c.storeId === storeId) {
      const existing = prevByDay.get(c.mappedDay)
      if (existing) {
        existing.sales += c.sales
        existing.discount += c.discount
      } else {
        prevByDay.set(c.mappedDay, { sales: c.sales, discount: c.discount })
      }
    }
  }

  const rows: DailyDiscountRateYoYRow[] = []
  let cumCurSales = 0
  let cumCurDiscount = 0
  let cumPrevSales = 0
  let cumPrevDiscount = 0

  for (let day = 1; day <= effectiveElapsed; day++) {
    const dailyRecord = sr.daily.get(day)
    const curSales = dailyRecord?.sales ?? 0
    const curDiscount = dailyRecord?.discountAbsolute ?? 0
    const curRate = calculateDiscountRate(curSales, curDiscount) * 100

    const prev = prevByDay.get(day)
    const prevSales = prev?.sales ?? 0
    const prevDiscount = prev?.discount ?? 0
    const prevRate = calculateDiscountRate(prevSales, prevDiscount) * 100

    cumCurSales += curSales
    cumCurDiscount += curDiscount
    cumPrevSales += prevSales
    cumPrevDiscount += prevDiscount

    const cumCurRate = calculateDiscountRate(cumCurSales, cumCurDiscount) * 100
    const cumPrevRate = calculateDiscountRate(cumPrevSales, cumPrevDiscount) * 100

    rows.push({
      day,
      curRate,
      prevRate,
      diff: curRate - prevRate,
      cumCurRate,
      cumPrevRate,
      cumDiff: cumCurRate - cumPrevRate,
    })
  }
  return rows
}

// ─── Daily Markup Rate YoY ──────────────────────────────

/** 日別値入率前年比行（日別 + 累計） */
export interface DailyMarkupRateYoYRow {
  readonly day: number
  /** 当年日別値入率 (×100済) */
  readonly curRate: number
  /** 前年日別値入率 (×100済) */
  readonly prevRate: number
  /** 日別差異 (pp) */
  readonly diff: number
  /** 当年累計値入率 (×100済) */
  readonly cumCurRate: number
  /** 前年累計値入率 (×100済) */
  readonly cumPrevRate: number
  /** 累計差異 (pp) */
  readonly cumDiff: number
}

/**
 * 店舗の日別値入率前年比を構築する。
 *
 * 当年: StoreResult.daily から日別の purchase/flowers/directProduce/interStore の
 *       cost/price を合算して値入率を算出。
 * 前年: DuckDB queryStoreDailyMarkupRate の結果（store × day）を使用。
 * 累計は cost/price の running total から率を再計算（率の平均ではない）。
 */
export function buildDailyMarkupRateYoYRows(
  sr: StoreResult,
  prevDailyData: ReadonlyMap<number, { totalCost: number; totalPrice: number }>,
  elapsedDays: number,
  daysInMonth: number,
): readonly DailyMarkupRateYoYRow[] {
  const effectiveElapsed = elapsedDays ?? daysInMonth
  const rows: DailyMarkupRateYoYRow[] = []

  let cumCurCost = 0
  let cumCurPrice = 0
  let cumPrevCost = 0
  let cumPrevPrice = 0

  for (let day = 1; day <= effectiveElapsed; day++) {
    const dailyRecord = sr.daily.get(day)

    // 当年: 全カテゴリの cost/price を合算
    let curCost = 0
    let curPrice = 0
    if (dailyRecord) {
      curCost =
        dailyRecord.purchase.cost +
        dailyRecord.flowers.cost +
        dailyRecord.directProduce.cost +
        dailyRecord.interStoreIn.cost +
        dailyRecord.interStoreOut.cost +
        dailyRecord.interDepartmentIn.cost +
        dailyRecord.interDepartmentOut.cost
      curPrice =
        dailyRecord.purchase.price +
        dailyRecord.flowers.price +
        dailyRecord.directProduce.price +
        dailyRecord.interStoreIn.price +
        dailyRecord.interStoreOut.price +
        dailyRecord.interDepartmentIn.price +
        dailyRecord.interDepartmentOut.price
    }

    const curRate = markupRateFromAmounts(curCost, curPrice) * 100

    // 前年
    const prev = prevDailyData.get(day)
    const prevCost = prev?.totalCost ?? 0
    const prevPrice = prev?.totalPrice ?? 0
    const prevRate = markupRateFromAmounts(prevCost, prevPrice) * 100

    // 累計
    cumCurCost += curCost
    cumCurPrice += curPrice
    cumPrevCost += prevCost
    cumPrevPrice += prevPrice

    const cumCurRate = markupRateFromAmounts(cumCurCost, cumCurPrice) * 100
    const cumPrevRate = markupRateFromAmounts(cumPrevCost, cumPrevPrice) * 100

    rows.push({
      day,
      curRate,
      prevRate,
      diff: curRate - prevRate,
      cumCurRate,
      cumPrevRate,
      cumDiff: cumCurRate - cumPrevRate,
    })
  }
  return rows
}
