/**
 * useFreePeriodAnalysisBundle — 自由期間分析の統合入口
 *
 * 1つの FreePeriodAnalysisFrame を入力に、3つの readModel をまとめて返す。
 * widget / panel ごとに readModel を個別に組み合わせない設計。
 *
 * ## 返す readModel
 * - fact: 売上/仕入/客数/売変（日別行 + 期間サマリー）
 * - budget: 期間予算（日割り按分済み）
 * - deptKPI: 部門KPI（売上加重平均）
 *
 * @layer Application — orchestration hook
 */
import { useMemo } from 'react'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import type { FreePeriodAnalysisFrame } from '@/domain/models/AnalysisFrame'
import type { CalendarDate } from '@/domain/models/CalendarDate'
import type {
  FreePeriodReadModel,
  FreePeriodQueryInput,
  FreePeriodBudgetReadModel,
  FreePeriodBudgetQueryInput,
  FreePeriodDeptKPIReadModel,
  FreePeriodDeptKPIQueryInput,
} from '@/application/readModels/freePeriod'
import { dateRangeToYearMonths } from '@/application/readModels/freePeriod'
import { useQueryWithHandler } from './useQueryWithHandler'
import { freePeriodHandler } from '@/application/queries/freePeriodHandler'
import { freePeriodBudgetHandler } from '@/application/queries/freePeriodBudgetHandler'
import { freePeriodDeptKPIHandler } from '@/application/queries/freePeriodDeptKPIHandler'

// ── 型定義 ──

/** readModel 名をキーとした個別エラーマップ */
export type FreePeriodErrors = Partial<Record<'fact' | 'budget' | 'deptKPI', Error>>

export interface FreePeriodAnalysisBundle {
  readonly fact: FreePeriodReadModel | null
  readonly budget: FreePeriodBudgetReadModel | null
  readonly deptKPI: FreePeriodDeptKPIReadModel | null
  readonly isLoading: boolean
  readonly errors: FreePeriodErrors
  readonly error: Error | null
}

// ── ヘルパー ──

function toDateString(d: CalendarDate): string {
  return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`
}

/** frame → 3 つの QueryInput を一括生成（純粋関数） */
function buildInputs(frame: FreePeriodAnalysisFrame | null): {
  fact: FreePeriodQueryInput | null
  budget: FreePeriodBudgetQueryInput | null
  deptKPI: FreePeriodDeptKPIQueryInput | null
} {
  if (!frame) return { fact: null, budget: null, deptKPI: null }

  const dateFrom = toDateString(frame.anchorRange.from)
  const dateTo = toDateString(frame.anchorRange.to)
  const storeIds = frame.storeIds.length > 0 ? [...frame.storeIds] : undefined

  const factBase: FreePeriodQueryInput = { dateFrom, dateTo, storeIds }
  const fact = frame.comparison
    ? {
        ...factBase,
        comparisonDateFrom: toDateString(frame.comparison.effectivePeriod2.from),
        comparisonDateTo: toDateString(frame.comparison.effectivePeriod2.to),
      }
    : factBase

  return {
    fact,
    budget: { dateFrom, dateTo, storeIds },
    deptKPI: { yearMonths: [...dateRangeToYearMonths(dateFrom, dateTo)] },
  }
}

// ── メインフック ──

export function useFreePeriodAnalysisBundle(
  executor: QueryExecutor | null,
  frame: FreePeriodAnalysisFrame | null,
): FreePeriodAnalysisBundle {
  const {
    fact: factInput,
    budget: budgetInput,
    deptKPI: deptKPIInput,
  } = useMemo(() => buildInputs(frame), [frame])

  // ── 3 handler を並列取得 ──
  const {
    data: factData,
    isLoading: factLoading,
    error: factError,
  } = useQueryWithHandler(executor, freePeriodHandler, factInput)

  const {
    data: budgetData,
    isLoading: budgetLoading,
    error: budgetError,
  } = useQueryWithHandler(executor, freePeriodBudgetHandler, budgetInput)

  const {
    data: deptKPIData,
    isLoading: deptKPILoading,
    error: deptKPIError,
  } = useQueryWithHandler(executor, freePeriodDeptKPIHandler, deptKPIInput)

  return useMemo(() => {
    const errors: FreePeriodErrors = {}
    if (factError) errors.fact = factError
    if (budgetError) errors.budget = budgetError
    if (deptKPIError) errors.deptKPI = deptKPIError

    return {
      fact: factData ?? null,
      budget: budgetData ?? null,
      deptKPI: deptKPIData ?? null,
      isLoading: factLoading || budgetLoading || deptKPILoading,
      errors,
      error: factError ?? budgetError ?? deptKPIError ?? null,
    }
  }, [
    factData,
    budgetData,
    deptKPIData,
    factLoading,
    budgetLoading,
    deptKPILoading,
    factError,
    budgetError,
    deptKPIError,
  ])
}
