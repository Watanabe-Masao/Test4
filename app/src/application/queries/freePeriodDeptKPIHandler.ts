/**
 * freePeriodDeptKPIHandler — 自由期間部門KPIの QueryHandler
 *
 * readFreePeriodDeptKPI を QueryHandler インターフェースでラップし、
 * useQueryWithHandler 経由で利用可能にする。
 *
 * @layer Application — Query Handler
 */
import type { QueryHandler } from './QueryContract'
import { readFreePeriodDeptKPI } from '@/application/readModels/freePeriod'
import type {
  FreePeriodDeptKPIQueryInput,
  FreePeriodDeptKPIReadModel,
} from '@/application/readModels/freePeriod'

export const freePeriodDeptKPIHandler: QueryHandler<
  FreePeriodDeptKPIQueryInput,
  FreePeriodDeptKPIReadModel
> = {
  name: 'freePeriodDeptKPI',
  execute: (conn, input) => readFreePeriodDeptKPI(conn, input),
}
