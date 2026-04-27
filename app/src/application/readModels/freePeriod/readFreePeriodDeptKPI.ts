/**
 * readFreePeriodDeptKPI — 自由期間部門KPIの唯一の read 関数
 *
 * department_kpi テーブルから対象年月の部門別 KPI を取得し、
 * 複数月分を部門ごとに集約して FreePeriodDeptKPIReadModel を返す。
 *
 * 集約規則:
 * - salesBudget / salesActual: 月次値の合計（SQL 側で算出）
 * - gpRateBudget / gpRateActual / markupRate / discountRate: 売上加重平均
 *   （SQL 側は加重和のみ、率への変換は本 builder で行う）
 * - salesAchievement: salesActual / salesBudget
 *
 * ## unify-period-analysis Phase 4 — 率計算の剥離
 *
 * Phase 4 以前は SQL 側で `SUM(rate * sales) / NULLIF(SUM(sales), 0)` として
 * 加重平均率を計算していたが、`data-pipeline-integrity.md` の
 * 「額で持ち回し、率は使用直前に domain 側で算出」原則に違反していた。
 * Phase 4 で SQL から除算を剥がし、本 builder が `weightedAverageRate()`
 * pure helper で率へ変換する。
 *
 * @responsibility R:unclassified
 */
import {
  FreePeriodDeptKPIReadModel,
  FreePeriodDeptKPIRow,
  type FreePeriodDeptKPIReadModel as FreePeriodDeptKPIReadModelType,
} from './FreePeriodDeptKPITypes'

/**
 * raw dept KPI row の最小型（infra 型に依存しない）。
 *
 * `*Weighted` フィールドは「売上加重和 = Σ(rate × sales_actual)」であり、
 * **率ではない**。率への変換は本 builder 内の `weightedAverageRate()` で行う。
 */
export interface RawDeptKPIInput {
  readonly deptCode: string
  readonly deptName: string | null
  readonly salesBudget: number
  readonly salesActual: number
  readonly gpRateBudgetWeighted: number | null
  readonly gpRateActualWeighted: number | null
  readonly markupRateWeighted: number | null
  readonly discountRateWeighted: number | null
}

/**
 * 売上加重平均率を計算する pure helper。
 *
 * - `weightedSum = Σ(rate × weight)` から
 * - `totalWeight = Σ weight` で除算して率に戻す
 *
 * @param weightedSum 加重和（null なら率も null）
 * @param totalWeight 加重（0 以下なら率は null = 分母がないため定義できない）
 * @returns 加重平均率 (`weightedSum / totalWeight`)、計算不能なら null
 *
 * Phase 4 で SQL の `NULLIF` 除算を本 helper に置換。pure function であり
 * React hooks / store / side effect を持たない。
 */
export function weightedAverageRate(
  weightedSum: number | null,
  totalWeight: number,
): number | null {
  if (weightedSum == null) return null
  if (totalWeight <= 0) return null
  return weightedSum / totalWeight
}

/**
 * 自由期間部門KPIの pure builder。
 *
 * raw query 結果を受け取り、以下を導出して Zod parse ReadModel を返す:
 *   - salesAchievement: salesActual / salesBudget
 *   - gpRateBudget / gpRateActual / markupRate / discountRate: 加重和 / salesActual
 */
/** @rm-id RM-009 */
export function buildFreePeriodDeptKPIReadModel(
  rawRows: readonly RawDeptKPIInput[],
  monthCount: number,
): FreePeriodDeptKPIReadModelType {
  const rows = rawRows.map((r) =>
    FreePeriodDeptKPIRow.parse({
      deptCode: r.deptCode,
      deptName: r.deptName,
      salesBudget: r.salesBudget,
      salesActual: r.salesActual,
      salesAchievement: r.salesBudget > 0 ? r.salesActual / r.salesBudget : null,
      gpRateBudget: weightedAverageRate(r.gpRateBudgetWeighted, r.salesActual),
      gpRateActual: weightedAverageRate(r.gpRateActualWeighted, r.salesActual),
      markupRate: weightedAverageRate(r.markupRateWeighted, r.salesActual),
      discountRate: weightedAverageRate(r.discountRateWeighted, r.salesActual),
    }),
  )

  return FreePeriodDeptKPIReadModel.parse({
    rows,
    monthCount,
  })
}

// ── 純粋関数（テスト用） ──

/**
 * DateRange から対象年月リストを生成する。
 */
export function dateRangeToYearMonths(
  dateFrom: string,
  dateTo: string,
): readonly { year: number; month: number }[] {
  const from = new Date(dateFrom)
  const to = new Date(dateTo)
  const result: { year: number; month: number }[] = []

  let y = from.getFullYear()
  let m = from.getMonth() + 1
  const endY = to.getFullYear()
  const endM = to.getMonth() + 1

  while (y < endY || (y === endY && m <= endM)) {
    result.push({ year: y, month: m })
    m++
    if (m > 12) {
      m = 1
      y++
    }
  }

  return result
}
