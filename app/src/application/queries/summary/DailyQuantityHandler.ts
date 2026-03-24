/**
 * DailyQuantityHandler — 日別買上点数クエリ
 *
 * DailySalesChart の「点数」右軸で使用。
 * store_day_summary.total_quantity を date_key で集約し、全店合計の日別点数を返す。
 */
import type { QueryHandler, BaseQueryInput } from '../QueryContract'
import {
  queryDailyQuantity,
  type DailyQuantityRow,
} from '@/infrastructure/duckdb/queries/aggregates/dailyAggregation'
import { queryToObjects } from '@/infrastructure/duckdb/queryRunner'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

export interface DailyQuantityInput extends BaseQueryInput {
  readonly isPrevYear?: boolean
}

export interface DailyQuantityOutput {
  readonly records: readonly DailyQuantityRow[]
}

export const dailyQuantityHandler: QueryHandler<DailyQuantityInput, DailyQuantityOutput> = {
  name: 'DailyQuantity',
  async execute(
    conn: AsyncDuckDBConnection,
    input: DailyQuantityInput,
  ): Promise<DailyQuantityOutput> {
    const records = await queryDailyQuantity(conn, input)

    // DEBUG: 前年点数2倍バグ調査用（原因特定後に削除）
    if (input.isPrevYear) {
      try {
        // VIEW の行重複チェック
        const dupSql = `
          SELECT date_key, store_id, COUNT(*) AS cnt, SUM(total_quantity) AS qty
          FROM store_day_summary
          WHERE date_key BETWEEN '${input.dateFrom}' AND '${input.dateTo}'
            AND is_prev_year = true
          GROUP BY date_key, store_id
          HAVING COUNT(*) > 1
          LIMIT 10`
        const dupes = await queryToObjects<{
          date_key: string
          store_id: string
          cnt: number
          qty: number
        }>(conn, dupSql)
        if (dupes.length > 0) {
          console.error('[DailyQty DEBUG] ⚠ store_day_summary に行重複あり:', dupes)
        } else {
          console.log('[DailyQty DEBUG] ✓ store_day_summary 行重複なし (is_prev_year=true)')
        }

        // category_time_sales の raw 件数チェック
        const ctsSql = `
          SELECT day, COUNT(*) AS row_count, SUM(total_quantity) AS qty
          FROM category_time_sales
          WHERE year = CAST(SUBSTR('${input.dateFrom}', 1, 4) AS INTEGER)
            AND month = CAST(SUBSTR('${input.dateFrom}', 6, 2) AS INTEGER)
            AND is_prev_year = true
          GROUP BY day
          ORDER BY day
          LIMIT 5`
        const ctsRows = await queryToObjects<{ day: number; row_count: number; qty: number }>(
          conn,
          ctsSql,
        )
        console.log('[DailyQty DEBUG] category_time_sales raw (先頭5日):', ctsRows)

        // 前年レコードの合計値
        const totalQty = records.reduce((s, r) => s + r.dailyQuantity, 0)
        console.log(
          `[DailyQty DEBUG] 前年 queryDailyQuantity: ${records.length}件, 合計qty=${totalQty}`,
        )
      } catch (e) {
        console.warn('[DailyQty DEBUG] デバッグクエリ失敗:', e)
      }
    }

    return { records }
  },
}

export type { DailyQuantityRow }
