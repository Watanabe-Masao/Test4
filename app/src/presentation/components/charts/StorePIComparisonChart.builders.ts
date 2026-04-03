/**
 * StorePIComparisonChart — 純粋なデータ変換関数
 *
 * 店舗別PI値計算とヒートマップデータ整形を純粋関数で完結。
 *
 * @guard H4 component に acquisition logic 禁止 — 導出は builders で一度だけ
 */
import { safeDivide } from '@/domain/calculations/utils'
import type { StoreResult } from '@/domain/models/StoreResult'
import type { Store } from '@/domain/models/Store'
import type { StoreCategoryPIOutput } from '@/application/queries/cts/StoreCategoryPIHandler'

export type Metric = 'piAmount' | 'piQty'

export interface StorePIEntry {
  readonly storeId: string
  readonly name: string
  readonly piAmount: number
  readonly piQty: number
}

export interface HeatmapData {
  readonly categories: readonly string[]
  readonly storeList: readonly { readonly id: string; readonly name: string }[]
  readonly heatData: readonly [number, number, number][]
  readonly maxVal: number
}

/**
 * allStoreResults から店舗別 PI データを構築し metric でソート。
 */
export function buildStorePIData(
  allStoreResults: ReadonlyMap<string, StoreResult>,
  stores: ReadonlyMap<string, Store>,
  metric: Metric,
): readonly StorePIEntry[] {
  const entries: StorePIEntry[] = []
  for (const [storeId, result] of allStoreResults) {
    if (result.totalCustomers <= 0) continue
    entries.push({
      storeId,
      name: stores.get(storeId)?.name ?? storeId,
      piAmount: Math.round(safeDivide(result.totalSales, result.totalCustomers, 0) * 1000),
      piQty:
        'totalQuantity' in result && typeof result.totalQuantity === 'number'
          ? Math.round(safeDivide(result.totalQuantity, result.totalCustomers, 0) * 1000)
          : 0,
    })
  }
  return entries.sort((a, b) =>
    metric === 'piAmount' ? b.piAmount - a.piAmount : b.piQty - a.piQty,
  )
}

/**
 * StoreCategoryPIOutput からヒートマップ用データを構築。
 * カテゴリ Top10 抽出 + [catIdx, storeIdx, value] 整形。
 */
export function buildHeatmapData(
  catOutput: StoreCategoryPIOutput,
  stores: ReadonlyMap<string, Store>,
  metric: Metric,
): HeatmapData {
  const records = catOutput.records

  // カテゴリ一覧（全店合算でソート → Top10）
  const catTotals = new Map<string, number>()
  for (const r of records) {
    const val = metric === 'piAmount' ? r.piAmount : r.piQty
    catTotals.set(r.name, (catTotals.get(r.name) ?? 0) + val)
  }
  const categories = [...catTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name]) => name)

  // 店舗一覧
  const storeIdSet = new Set(records.map((r) => r.storeId))
  const storeList = [...storeIdSet].map((id) => ({
    id,
    name: stores.get(id)?.name ?? id,
  }))

  const catIdx = new Map(categories.map((c, i) => [c, i]))
  const storeIdx = new Map(storeList.map((s, i) => [s.id, i]))

  let maxVal = 0
  const heatData: [number, number, number][] = []
  for (const r of records) {
    const ci = catIdx.get(r.name)
    if (ci == null) continue
    const si = storeIdx.get(r.storeId)
    if (si == null) continue
    const val = Math.round(metric === 'piAmount' ? r.piAmount : r.piQty)
    heatData.push([ci, si, val])
    if (val > maxVal) maxVal = val
  }

  return { categories, storeList, heatData, maxVal }
}
