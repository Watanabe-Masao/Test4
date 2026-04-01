/**
 * freePeriodHandler — 自由期間分析の QueryHandler
 *
 * readFreePeriodFact を QueryHandler インターフェースでラップし、
 * useQueryWithHandler 経由で利用可能にする。
 *
 * @layer Application — Query Handler
 */
import type { QueryHandler } from './QueryContract'
import { readFreePeriodFact } from '@/application/readModels/freePeriod'
import type { FreePeriodQueryInput, FreePeriodReadModel } from '@/application/readModels/freePeriod'

export const freePeriodHandler: QueryHandler<FreePeriodQueryInput, FreePeriodReadModel> = {
  name: 'freePeriod',
  execute: (conn, input) => readFreePeriodFact(conn, input),
}
