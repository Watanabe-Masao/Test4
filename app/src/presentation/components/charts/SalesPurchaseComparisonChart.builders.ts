/**
 * SalesPurchaseComparisonChart — pure data builder
 *
 * useMemo body の pure 計算抽出 (ADR-D-003 PR4)。
 * 店舗別の売上 / 仕入 / 推定在庫を含むチャート用 record 配列を組み立てる。
 *
 * @responsibility R:utility
 * @guard G5-CRT chart component 外配置で inline builder 違反を回避
 */
import { computeEstimatedInventory } from '@/application/hooks/calculation'
import type { StoreResult } from '@/domain/models/storeTypes'

export interface SalesPurchaseStoreEntry {
  readonly storeId: string
  readonly name: string
  readonly hasInventory: boolean
  readonly result: StoreResult
}

export type LaneDailyByStore = ReadonlyMap<
  string,
  ReadonlyMap<number, { readonly sales: number; readonly purchaseCost: number }>
>

export function buildSalesPurchaseChartData(
  storeEntries: readonly SalesPurchaseStoreEntry[],
  daysInMonth: number,
  rangeStart: number,
  rangeEnd: number,
  laneDailyByStore: LaneDailyByStore,
): Record<string, number | null>[] {
  // 推定在庫線は StoreResult.daily を継続利用 (StoreDailySeries には
  // markup / discount rate / 仕入内訳が含まれないため計算不可)。
  // これが storeDailyLaneSurfaceGuard baseline=1 の intentional floor。
  const invByStore = new Map<string, ReturnType<typeof computeEstimatedInventory>>()
  for (const s of storeEntries) {
    if (s.hasInventory) {
      invByStore.set(
        s.storeId,
        computeEstimatedInventory(
          s.result.daily,
          daysInMonth,
          s.result.openingInventory!,
          s.result.closingInventory,
          s.result.coreMarkupRate,
          s.result.discountRate,
        ),
      )
    }
  }

  const data: Record<string, number | null>[] = []
  for (let d = 1; d <= daysInMonth; d++) {
    const entry: Record<string, number | null> = { day: d }
    for (const s of storeEntries) {
      // Phase 6.5-5: sales / purchase は lane 経由で取得する。
      // lane series 未ロード時は 0 で埋めて flicker を避ける。
      const lanePoint = laneDailyByStore.get(s.storeId)?.get(d)
      entry[`${s.name}_売上`] = lanePoint?.sales ?? 0
      entry[`${s.name}_仕入`] = lanePoint?.purchaseCost ?? 0
      const inv = invByStore.get(s.storeId)
      entry[`${s.name}_推定在庫`] = inv?.[d - 1]?.estimated ?? null
    }
    data.push(entry)
  }
  return data.filter((d) => (d.day as number) >= rangeStart && (d.day as number) <= rangeEnd)
}
