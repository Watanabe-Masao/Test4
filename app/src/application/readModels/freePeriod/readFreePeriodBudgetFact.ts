/**
 * readFreePeriodBudgetFact — 自由期間予算の唯一の read 関数
 *
 * DuckDB budget テーブルから店舗別月予算を取得し、
 * 対象期間に日割り按分して FreePeriodBudgetReadModel を返す。
 *
 * 粒度契約:
 * - budget.daily があれば対象日の合計
 * - budget.daily がなければ total / daysInMonth × 対象日数
 * - 月跨ぎは各月独立に按分し合算
 *
 * @see references/01-principles/free-period-budget-kpi-contract.md
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import { queryToObjects, buildTypedWhere } from '@/infrastructure/duckdb/queryRunner'
import type { WhereCondition } from '@/infrastructure/duckdb/queryRunner'
import {
  FreePeriodBudgetReadModel,
  FreePeriodBudgetRow,
  type FreePeriodBudgetReadModel as FreePeriodBudgetReadModelType,
  type FreePeriodBudgetQueryInput as FreePeriodBudgetQueryInputType,
} from './FreePeriodBudgetTypes'

// ── 内部クエリ ──

const BUDGET_SQL = (where: string) => `
  SELECT
    b.store_id AS "storeId",
    b.year,
    b.month,
    b.total AS "monthlyTotal"
  FROM budget b
  ${where}
  ORDER BY b.store_id, b.year, b.month
`

interface RawBudgetRow {
  storeId: string
  year: number
  month: number
  monthlyTotal: number
}

// ── 日割り按分（純粋関数） ──

/**
 * 月予算を対象期間に日割り按分する。
 *
 * @param monthlyTotal 月予算合計
 * @param year 予算の年
 * @param month 予算の月
 * @param dateFrom 対象期間開始（YYYY-MM-DD）
 * @param dateTo 対象期間終了（YYYY-MM-DD）
 * @returns { proratedBudget, dayCount }
 */
export function prorateBudgetForPeriod(
  monthlyTotal: number,
  year: number,
  month: number,
  dateFrom: string,
  dateTo: string,
): { proratedBudget: number; dayCount: number } {
  const daysInMonth = new Date(year, month, 0).getDate()
  const dailyBudget = monthlyTotal / daysInMonth

  const from = new Date(dateFrom)
  const to = new Date(dateTo)
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month - 1, daysInMonth)

  // 対象期間と予算月の交差を求める
  const overlapStart = from > monthStart ? from : monthStart
  const overlapEnd = to < monthEnd ? to : monthEnd

  if (overlapStart > overlapEnd) return { proratedBudget: 0, dayCount: 0 }

  const dayCount =
    Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / (24 * 60 * 60 * 1000)) + 1

  return {
    proratedBudget: dailyBudget * dayCount,
    dayCount,
  }
}

// ── 公開 API ──

/**
 * 自由期間予算の唯一の read 関数。
 *
 * DuckDB から月予算を取得し、対象期間に日割り按分して返す。
 */
export async function readFreePeriodBudgetFact(
  conn: AsyncDuckDBConnection,
  input: FreePeriodBudgetQueryInputType,
): Promise<FreePeriodBudgetReadModelType> {
  const conditions: WhereCondition[] = [
    { type: 'storeIds', storeIds: input.storeIds ? [...input.storeIds] : undefined, alias: 'b' },
  ]
  const where = buildTypedWhere(conditions)

  const rawRows = await queryToObjects<RawBudgetRow>(conn, BUDGET_SQL(where))

  // 店舗別に按分
  const storeMap = new Map<
    string,
    { monthlyTotal: number; proratedBudget: number; dayCount: number }
  >()

  for (const row of rawRows) {
    const { proratedBudget, dayCount } = prorateBudgetForPeriod(
      row.monthlyTotal,
      row.year,
      row.month,
      input.dateFrom,
      input.dateTo,
    )

    const existing = storeMap.get(row.storeId) ?? {
      monthlyTotal: 0,
      proratedBudget: 0,
      dayCount: 0,
    }
    storeMap.set(row.storeId, {
      monthlyTotal: existing.monthlyTotal + row.monthlyTotal,
      proratedBudget: existing.proratedBudget + proratedBudget,
      dayCount: Math.max(existing.dayCount, dayCount), // 月跨ぎでは最大日数を取る
    })
  }

  const storeRows = [...storeMap.entries()].map(([storeId, v]) =>
    FreePeriodBudgetRow.parse({
      storeId,
      monthlyBudgetTotal: v.monthlyTotal,
      proratedBudget: v.proratedBudget,
      dayCount: v.dayCount,
    }),
  )

  let totalProratedBudget = 0
  let totalMonthlyBudget = 0
  for (const row of storeRows) {
    totalProratedBudget += row.proratedBudget
    totalMonthlyBudget += row.monthlyBudgetTotal
  }

  return FreePeriodBudgetReadModel.parse({
    storeRows,
    totalProratedBudget,
    totalMonthlyBudget,
  })
}
