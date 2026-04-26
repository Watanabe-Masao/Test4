/**
 * CategoryDiscountChart — pure data builder
 *
 * useMemo body の pure 計算抽出 (ADR-D-003 PR4)。
 * 値引きカテゴリレコードを sortKey / sortDir / 前年マップに従って並べ替える。
 *
 * @responsibility R:utility
 */
// 元 .tsx と同じ inline type import パターン (queryAccessAudit が
// 通常の import 文経由の infrastructure/duckdb を直 import 経路として
// 禁ずるため、inline 型展開で回避)。
type CategoryDiscountRow =
  import('@/infrastructure/duckdb/queries/categoryDiscount').CategoryDiscountRow
import type { SortKey, SortDir } from './CategoryDiscountTable'

export function sortDiscountRecords(
  raw: readonly CategoryDiscountRow[],
  sortKey: SortKey,
  sortDir: SortDir,
  prevByCode: ReadonlyMap<string, CategoryDiscountRow>,
): readonly CategoryDiscountRow[] {
  const totalDiscount = raw.reduce((s, x) => s + x.discountTotal, 0)
  const getValue = (r: CategoryDiscountRow): number => {
    switch (sortKey) {
      case 'discountTotal':
        return Math.abs(r.discountTotal)
      case 'discountRate':
        return r.salesAmount > 0 ? Math.abs(r.discountTotal / r.salesAmount) : 0
      case 'share':
        return totalDiscount !== 0 ? Math.abs(r.discountTotal / totalDiscount) : 0
      case 'prevYoyRate': {
        const prev = prevByCode.get(r.code)
        if (!prev || prev.discountTotal === 0) return -Infinity
        return (r.discountTotal - prev.discountTotal) / Math.abs(prev.discountTotal)
      }
      case 'prevDiscountRate': {
        const prev = prevByCode.get(r.code)
        if (!prev || prev.salesAmount === 0) return -Infinity
        return Math.abs(prev.discountTotal / prev.salesAmount)
      }
      case 'discount71':
        return Math.abs(r.discount71)
      case 'discount72':
        return Math.abs(r.discount72)
      case 'discount73':
        return Math.abs(r.discount73)
      case 'discount74':
        return Math.abs(r.discount74)
    }
  }
  return [...raw].sort((a, b) => {
    const va = getValue(a)
    const vb = getValue(b)
    return sortDir === 'desc' ? vb - va : va - vb
  })
}
