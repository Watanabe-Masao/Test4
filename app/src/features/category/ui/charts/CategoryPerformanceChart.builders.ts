/**
 * CategoryPerformanceChart — 純粋なデータ変換関数
 *
 * LevelAggregation の current/prev レコードから CategoryRow[] を構築する。
 * PI計算 → 偏差値算出 → TopN ソート を純粋関数で完結。
 *
 * @guard H4 component に acquisition logic 禁止 — 導出は builders で一度だけ
 */
import { calculateAmountPI, calculateQuantityPI } from '@/domain/calculations/piValue'
import { calculateStdDev } from '@/application/hooks/useStatistics'
import { toDevScore } from '@/presentation/components/charts/chartTheme'
import type { LevelAggregationRow } from '@/application/queries/cts/LevelAggregationHandler'

export interface CategoryRow {
  readonly code: string
  readonly name: string
  readonly amount: number
  readonly quantity: number
  readonly piAmount: number
  readonly piQty: number
  readonly prevPiAmount: number | null
  readonly prevPiQty: number | null
  readonly deviation: number | null
  readonly qtyDeviation: number | null
}

const DEFAULT_TOP_N = 20

/**
 * LevelAggregation の current/prev レコードから CategoryRow[] を構築する。
 *
 * 1. PI値算出（domain/calculations/piValue 経由）
 * 2. 偏差値算出（calculateStdDev → toDevScore）
 * 3. piAmount 降順ソート + TopN 切り出し
 */
export function buildCategoryRows(
  curRecords: readonly LevelAggregationRow[],
  prevRecords: readonly LevelAggregationRow[] | null,
  totalCustomers: number,
  prevTotalCustomers: number,
  topN: number = DEFAULT_TOP_N,
): readonly CategoryRow[] {
  if (curRecords.length === 0 || totalCustomers <= 0) return []

  const prevMap = new Map<string, { amount: number; quantity: number }>()
  if (prevRecords && prevTotalCustomers > 0) {
    for (const row of prevRecords) {
      prevMap.set(row.code, { amount: row.amount, quantity: row.quantity })
    }
  }

  const piAmounts: number[] = []
  const piQtys: number[] = []

  const rows: {
    code: string
    name: string
    amount: number
    quantity: number
    piAmount: number
    piQty: number
    prevPiAmount: number | null
    prevPiQty: number | null
    deviation: number | null
    qtyDeviation: number | null
  }[] = []

  for (const entry of curRecords) {
    const piAmount = calculateAmountPI(entry.amount, totalCustomers)
    const piQty = calculateQuantityPI(entry.quantity, totalCustomers)

    let prevPiAmount: number | null = null
    let prevPiQty: number | null = null
    if (prevTotalCustomers > 0) {
      const prev = prevMap.get(entry.code)
      if (prev) {
        prevPiAmount = calculateAmountPI(prev.amount, prevTotalCustomers)
        prevPiQty = calculateQuantityPI(prev.quantity, prevTotalCustomers)
      }
    }

    piAmounts.push(piAmount)
    piQtys.push(piQty)

    rows.push({
      code: entry.code,
      name: entry.name || entry.code,
      amount: entry.amount,
      quantity: entry.quantity,
      piAmount,
      piQty,
      prevPiAmount,
      prevPiQty,
      deviation: null,
      qtyDeviation: null,
    })
  }

  // Compute deviation scores
  const amtStat = calculateStdDev(piAmounts)
  const qtyStat = calculateStdDev(piQtys)

  for (const row of rows) {
    if (amtStat.stdDev > 0) {
      row.deviation = toDevScore((row.piAmount - amtStat.mean) / amtStat.stdDev)
    }
    if (qtyStat.stdDev > 0) {
      row.qtyDeviation = toDevScore((row.piQty - qtyStat.mean) / qtyStat.stdDev)
    }
  }

  // Sort by piAmount descending, limit to topN
  rows.sort((a, b) => b.piAmount - a.piAmount)
  return rows.slice(0, topN)
}
