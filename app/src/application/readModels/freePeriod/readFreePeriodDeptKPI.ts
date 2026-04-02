/**
 * readFreePeriodDeptKPI — 自由期間部門KPIの唯一の read 関数
 *
 * department_kpi テーブルから対象年月の部門別 KPI を取得し、
 * 複数月分を部門ごとに集約して FreePeriodDeptKPIReadModel を返す。
 *
 * 集約規則:
 * - salesBudget / salesActual: 月次値の合計
 * - gpRateBudget / gpRateActual / markupRate / discountRate: 売上加重平均
 * - salesAchievement: salesActual / salesBudget
 */
import {
  FreePeriodDeptKPIReadModel,
  FreePeriodDeptKPIRow,
  type FreePeriodDeptKPIReadModel as FreePeriodDeptKPIReadModelType,
} from './FreePeriodDeptKPITypes'

/** raw dept KPI row の最小型（infra 型に依存しない） */
export interface RawDeptKPIInput {
  readonly deptCode: string
  readonly deptName: string | null
  readonly salesBudget: number
  readonly salesActual: number
  readonly gpRateBudget: number | null
  readonly gpRateActual: number | null
  readonly markupRate: number | null
  readonly discountRate: number | null
}

/**
 * 自由期間部門KPIの pure builder。
 *
 * raw query 結果を受け取り、salesAchievement 導出 + Zod parse して ReadModel を返す。
 */
export function buildFreePeriodDeptKPIReadModel(
  rawRows: readonly RawDeptKPIInput[],
  monthCount: number,
): FreePeriodDeptKPIReadModelType {
  const rows = rawRows.map((r) =>
    FreePeriodDeptKPIRow.parse({
      ...r,
      salesAchievement: r.salesBudget > 0 ? r.salesActual / r.salesBudget : null,
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
