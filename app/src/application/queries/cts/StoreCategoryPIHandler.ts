/**
 * StoreCategoryPIHandler — 店舗×カテゴリPI値の QueryHandler
 *
 * 店舗別カテゴリ売上と客数を取得し、PI値を算出して返す。
 *
 * @responsibility R:unclassified
 */
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { QueryHandler, BaseQueryInput } from '@/application/queries/QueryContract'
import type { PrevYearFlag } from '../comparisonQueryScope'
import { calculateQuantityPI, calculateAmountPI } from '@/domain/calculations/piValue'
import {
  queryStoreCategoryAggregation,
  queryStoreCustomers,
} from '@/infrastructure/duckdb/queries/storeCategoryAggregation'

export interface StoreCategoryPIInput extends BaseQueryInput {
  readonly level: 'department' | 'line' | 'klass'
}

export interface StoreCategoryPIRow {
  readonly storeId: string
  readonly code: string
  readonly name: string
  readonly amount: number
  readonly quantity: number
  readonly piAmount: number
  readonly piQty: number
}

export interface StoreCategoryPIOutput {
  readonly records: readonly StoreCategoryPIRow[]
  readonly storeCustomers: ReadonlyMap<string, number>
}

/** Internal: isPrevYear is injected by createPairedHandler at runtime */
type ExecuteInput = StoreCategoryPIInput & { readonly isPrevYear?: PrevYearFlag }

export const storeCategoryPIHandler: QueryHandler<ExecuteInput, StoreCategoryPIOutput> = {
  name: 'StoreCategoryPI',
  async execute(conn: AsyncDuckDBConnection, input: ExecuteInput): Promise<StoreCategoryPIOutput> {
    const isPrevYear = input.isPrevYear ?? false
    const [catRows, custRows] = await Promise.all([
      queryStoreCategoryAggregation(conn, {
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        storeIds: input.storeIds,
        level: input.level,
        isPrevYear,
      }),
      queryStoreCustomers(conn, {
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        storeIds: input.storeIds,
        isPrevYear,
      }),
    ])

    const customerMap = new Map<string, number>()
    for (const row of custRows) {
      customerMap.set(row.storeId, row.totalCustomers)
    }

    const records: StoreCategoryPIRow[] = catRows.map((row) => {
      const customers = customerMap.get(row.storeId) ?? 0
      return {
        storeId: row.storeId,
        code: row.code,
        name: row.name,
        amount: row.amount,
        quantity: row.quantity,
        piAmount: calculateAmountPI(row.amount, customers),
        piQty: calculateQuantityPI(row.quantity, customers),
      }
    })

    return { records, storeCustomers: customerMap }
  },
}
