/**
 * factorDecomposition 観測フィクスチャ
 *
 * 4 カテゴリ: normal / nullZeroMissing / extreme / boundary
 * 4 関数: decompose2, decompose3, decompose5, decomposePriceMix
 */
import type { CategoryQtyAmt } from '@/domain/calculations/factorDecomposition'

export interface FactorDecompositionFixture {
  readonly name: string
  readonly prevSales: number
  readonly curSales: number
  readonly prevCust: number
  readonly curCust: number
  readonly prevQty: number
  readonly curQty: number
  readonly prevCats: readonly CategoryQtyAmt[]
  readonly curCats: readonly CategoryQtyAmt[]
}

function cat(key: string, qty: number, amt: number): CategoryQtyAmt {
  return { key, qty, amt }
}

export const NORMAL: FactorDecompositionFixture = {
  name: 'normal',
  prevSales: 200_000,
  curSales: 280_000,
  prevCust: 100,
  curCust: 120,
  prevQty: 500,
  curQty: 600,
  prevCats: [cat('food', 300, 150_000), cat('daily', 200, 50_000)],
  curCats: [cat('food', 360, 200_000), cat('daily', 240, 80_000)],
}

export const NULL_ZERO_MISSING: FactorDecompositionFixture = {
  name: 'null-zero-missing',
  prevSales: 0,
  curSales: 100_000,
  prevCust: 0,
  curCust: 50,
  prevQty: 0,
  curQty: 200,
  prevCats: [],
  curCats: [cat('food', 200, 100_000)],
}

export const EXTREME: FactorDecompositionFixture = {
  name: 'extreme',
  prevSales: 5e11,
  curSales: 8e11,
  prevCust: 200_000,
  curCust: 300_000,
  prevQty: 1_000_000,
  curQty: 1_500_000,
  prevCats: [cat('A', 800_000, 4e11), cat('B', 200_000, 1e11)],
  curCats: [cat('A', 900_000, 5e11), cat('B', 600_000, 3e11)],
}

export const BOUNDARY: FactorDecompositionFixture = {
  name: 'boundary',
  prevSales: 100,
  curSales: 100,
  prevCust: 1,
  curCust: 1,
  prevQty: 1,
  curQty: 1,
  prevCats: [cat('X', 1, 100)],
  curCats: [cat('X', 1, 100)],
}

export const ALL_FIXTURES: readonly FactorDecompositionFixture[] = [
  NORMAL,
  NULL_ZERO_MISSING,
  EXTREME,
  BOUNDARY,
]
