/**
 * StoreDailyMarkupRateHandler — 店舗日別仕入額（原価/売価）クエリ
 *
 * purchase + special_sales + transfers の日別原価/売価合計を取得し、
 * day 別 Map に集約して返す。
 *
 * 率の算出は domain/calculations に委譲する（@guard B3）。
 *
 * @responsibility R:unclassified
 */
import type { QueryHandler } from '../QueryContract'
import { queryStoreDailyMarkupRate } from '@/infrastructure/duckdb/queries/purchaseComparison'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

/** 日別原価/売価マップ */
export type DailyMarkupCostPriceMap = ReadonlyMap<number, { totalCost: number; totalPrice: number }>

export interface StoreDailyMarkupRateInput {
  readonly dateFrom: string
  readonly dateTo: string
  readonly storeId: string
}

export interface StoreDailyMarkupRateOutput {
  readonly data: DailyMarkupCostPriceMap
}

export const storeDailyMarkupRateHandler: QueryHandler<
  StoreDailyMarkupRateInput,
  StoreDailyMarkupRateOutput
> = {
  name: 'StoreDailyMarkupRate',
  async execute(
    conn: AsyncDuckDBConnection,
    input: StoreDailyMarkupRateInput,
  ): Promise<StoreDailyMarkupRateOutput> {
    const allRows = await queryStoreDailyMarkupRate(conn, input.dateFrom, input.dateTo, [
      input.storeId,
    ])

    const byDay = new Map<number, { totalCost: number; totalPrice: number }>()
    for (const r of allRows) {
      const existing = byDay.get(r.day)
      if (existing) {
        existing.totalCost += r.totalCost
        existing.totalPrice += r.totalPrice
      } else {
        byDay.set(r.day, { totalCost: r.totalCost, totalPrice: r.totalPrice })
      }
    }
    return { data: byDay }
  },
}
