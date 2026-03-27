/**
 * aggregateStoreDaySummaryByDateKey — store×day rows を dateKey 単位で集約
 *
 * queryStoreDaySummary は store×day 単位で返すため、複数店舗選択時に
 * 同じ dateKey に対して複数行が存在する。
 * moving average に入る前に「日別合計」の意味を確定する。
 *
 * 集約対象: sales, customers, coreSales（SUM）
 * year/month/day/dateKey は同一グループの先頭行から取得。
 *
 * これは Domain の数学的計算ではなく、Application のデータ解釈責務。
 */
import type { StoreDaySummaryRowForTemporal } from './storeDaySummaryTemporalAdapter'

/**
 * store×day rows を dateKey 単位で集約する。
 *
 * 入力の並び順に依存しない（Map で集約）。
 * 出力は dateKey 昇順でソート。
 */
export function aggregateStoreDaySummaryByDateKey(
  rows: readonly StoreDaySummaryRowForTemporal[],
): readonly StoreDaySummaryRowForTemporal[] {
  const map = new Map<
    string,
    {
      year: number
      month: number
      day: number
      dateKey: string
      sales: number
      customers: number
      coreSales: number
      totalQuantity: number
      discountAbsolute: number
    }
  >()

  for (const row of rows) {
    const existing = map.get(row.dateKey)
    if (existing) {
      existing.sales += row.sales
      existing.customers += row.customers
      existing.coreSales += row.coreSales
      existing.totalQuantity += row.totalQuantity
      existing.discountAbsolute += row.discountAbsolute
    } else {
      map.set(row.dateKey, {
        year: row.year,
        month: row.month,
        day: row.day,
        dateKey: row.dateKey,
        sales: row.sales,
        customers: row.customers,
        coreSales: row.coreSales,
        totalQuantity: row.totalQuantity,
        discountAbsolute: row.discountAbsolute,
      })
    }
  }

  return [...map.values()].sort((a, b) =>
    a.dateKey < b.dateKey ? -1 : a.dateKey > b.dateKey ? 1 : 0,
  )
}
