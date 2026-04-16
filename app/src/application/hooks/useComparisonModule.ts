/**
 * useComparisonModule — Legacy facade (features/ 外)
 *
 * phase-6-optional-comparison-projection Phase O5:
 * PeriodSelection を受け取り、buildComparisonProjectionContext で最小 contract に
 * 変換して useComparisonModuleCore に委譲する。
 *
 * features/comparison/ 内部は PeriodSelection を知らない (import guard で保証)。
 * このファイルが features/ 外で PeriodSelection → ComparisonProjectionContext の
 * 変換を担う唯一の点。
 *
 * 既存 caller (useComparisonSlice / usePageComparisonModule) は本 wrapper 経由で
 * 動作継続する。Phase O6 で useComparisonSlice を core 直接呼び出しに移行予定。
 */
import { useMemo } from 'react'
import type { PeriodSelection } from '@/domain/models/PeriodSelection'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'
import { buildComparisonScope } from '@/domain/models/ComparisonScope'
import { buildComparisonProjectionContext } from '@/features/comparison/application/buildComparisonProjectionContext'
import { useComparisonModuleCore } from '@/features/comparison/application/hooks/useComparisonModuleCore'

// Re-export types for backward compat
export type { ComparisonModule } from '@/features/comparison/application/hooks/useComparisonModule'
export { useComparisonModuleCore } from '@/features/comparison/application/hooks/useComparisonModuleCore'
export type { UseComparisonModuleCoreInput } from '@/features/comparison/application/hooks/useComparisonModuleCore'

/**
 * Legacy wrapper — PeriodSelection を受け取り core に委譲する。
 *
 * @param periodSelection 期間選択（source of truth）
 * @param elapsedDays 当期の経過日数（elapsedDays cap 用）
 * @param currentAverageDailySales 当期の日平均売上（dowGap用）
 * @param externalScope caller が構築済みの ComparisonScope（Phase 6a の任意 input）
 */
export function useComparisonModule(
  periodSelection: PeriodSelection,
  elapsedDays: number | undefined,
  currentAverageDailySales: number,
  externalScope?: ComparisonScope | null,
) {
  // scope 構築 — externalScope が渡されている場合はそれを使い、内部構築を skip
  const scope = useMemo((): ComparisonScope | null => {
    if (externalScope !== undefined) return externalScope
    if (!periodSelection.comparisonEnabled) return null
    return buildComparisonScope(periodSelection, elapsedDays)
  }, [externalScope, periodSelection, elapsedDays])

  // PeriodSelection → ComparisonProjectionContext 変換
  const projectionContext = useMemo(
    () => buildComparisonProjectionContext(periodSelection),
    [periodSelection],
  )

  return useComparisonModuleCore({
    scope,
    projectionContext,
    currentAverageDailySales,
  })
}
