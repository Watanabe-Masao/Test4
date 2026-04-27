/**
 * WaterfallChart — pure data builder
 *
 * useMemo body の pure 計算抽出 (ADR-D-003 PR4)。
 * StoreResult 集計値からウォーターフォール表示用 items 配列を組み立てる。
 *
 * @responsibility R:unclassified
 */
import type { StoreResult } from '@/domain/models/storeTypes'

export interface WaterfallItem {
  readonly name: string
  readonly value: number
  readonly base: number
  readonly bar: number
  readonly isTotal?: boolean
}

export function buildWaterfallItems(r: StoreResult): readonly WaterfallItem[] {
  const totalSales = r.totalSales
  const totalCost = r.totalCost
  const discountLoss = -r.totalDiscount
  const costInclusion = -r.totalCostInclusion

  const items: WaterfallItem[] = []

  items.push({
    name: '売上高',
    value: totalSales,
    base: 0,
    bar: totalSales,
    isTotal: true,
  })

  items.push({
    name: '仕入原価',
    value: -totalCost,
    base: totalSales - totalCost,
    bar: totalCost,
  })

  const afterCost = totalSales - totalCost
  items.push({
    name: '売変ロス',
    value: discountLoss,
    base: afterCost + discountLoss,
    bar: Math.abs(discountLoss),
  })

  const afterDiscount = afterCost + discountLoss
  items.push({
    name: '原価算入費',
    value: costInclusion,
    base: afterDiscount + costInclusion,
    bar: Math.abs(costInclusion),
  })

  const finalGP = afterDiscount + costInclusion
  items.push({
    name: '粗利益',
    value: finalGP,
    base: 0,
    bar: finalGP,
    isTotal: true,
  })

  return items
}
