/**
 * 日別ページ用データ変換フック
 *
 * DailyPage のデータ集計ロジックを Application 層に分離。
 * - 取引先別内訳キーの収集
 * - 移動明細ルートタプルの構築
 * - 累計粗利率・売変率の計算
 */
import { useMemo } from 'react'
import type { DailyRecord, TransferBreakdownEntry } from '@/domain/models/record'
import { safeDivide, calculateGrossProfitRate } from '@/domain/calculations/utils'

/* ── 純粋関数 ───────────────────────────────── */

/** 取引先別の内訳キーを全日から収集する */
export function collectSupplierKeys(
  days: readonly [number, DailyRecord][],
  suppliers: ReadonlyMap<string, { code: string; name: string }>,
): { code: string; name: string }[] {
  const seen = new Map<string, string>()
  for (const [, rec] of days) {
    for (const [code] of rec.supplierBreakdown) {
      if (!seen.has(code)) {
        seen.set(code, suppliers.get(code)?.name ?? code)
      }
    }
  }
  return Array.from(seen.entries()).map(([code, name]) => ({ code, name }))
}

/** 移動明細の from→to キーを収集する */
export function collectTransferKeys(
  days: readonly [number, DailyRecord][],
  field: keyof DailyRecord['transferBreakdown'],
  stores: ReadonlyMap<string, { id: string; name: string }>,
): { key: string; from: string; to: string; label: string }[] {
  const seen = new Map<string, { from: string; to: string }>()
  for (const [, rec] of days) {
    const entries = rec.transferBreakdown[field]
    for (const e of entries) {
      const key = `${e.fromStoreId}->${e.toStoreId}`
      if (!seen.has(key)) {
        seen.set(key, { from: e.fromStoreId, to: e.toStoreId })
      }
    }
  }
  return Array.from(seen.entries()).map(([key, { from, to }]) => {
    const fromName = stores.get(from)?.name ?? from
    const toName = stores.get(to)?.name ?? to
    const fromLabel = from.length <= 3 ? from.padStart(2, '0') : fromName
    const toLabel = to.length <= 3 ? to.padStart(2, '0') : toName
    return { key, from, to, label: `${fromLabel}→${toLabel}` }
  })
}

/** 移動明細の特定キーの合計を取得する */
export function getTransferAmount(
  entries: readonly TransferBreakdownEntry[],
  from: string,
  to: string,
): number {
  let total = 0
  for (const e of entries) {
    if (e.fromStoreId === from && e.toStoreId === to) total += e.cost
  }
  return total
}

/* ── フック ──────────────────────────────────── */

export interface CumulativeRates {
  readonly grossProfitRate: number
  readonly discountRate: number
}

/** 累計粗利率・売変率を日ごとに事前計算する */
export function useCumulativeRates(
  days: readonly [number, DailyRecord][],
): ReadonlyMap<number, CumulativeRates> {
  return useMemo(() => {
    const map = new Map<number, CumulativeRates>()
    let cumSales = 0
    let cumCost = 0
    let cumDiscount = 0
    let cumGrossSales = 0

    for (const [day, rec] of days) {
      cumSales += rec.sales
      cumCost += rec.totalCost
      cumDiscount += rec.discountAbsolute
      cumGrossSales += rec.grossSales

      map.set(day, {
        grossProfitRate: calculateGrossProfitRate(cumSales - cumCost, cumSales),
        discountRate: safeDivide(cumDiscount, cumGrossSales, 0),
      })
    }
    return map
  }, [days])
}
