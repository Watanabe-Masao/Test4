/**
 * usePageComparisonModule — page-level 用の comparison module 薄 wrapper
 *
 * unify-period-analysis Phase 6b: page-level caller
 * (`MobileDashboardPage` / `useInsightData`) が frame ベースの
 * `useComparisonModule` (4 引数版) を使えるようにするための wrapper。
 *
 * ## 背景
 *
 * - `useComparisonSlice` は `useUnifiedWidgetContext` 内で `buildFreePeriodFrame`
 *   を直接呼び、4 引数版の `useComparisonModule(..., frame.comparison)` に渡す
 * - page-level では `useUnifiedWidgetContext` を呼ぶのは重すぎる (slice 群を
 *   全て pull する) ため、軽量な wrapper が必要
 * - また `freePeriodPathGuard` が `buildFreePeriodFrame` の presentation 直接
 *   import を `useUnifiedWidgetContext.ts` のみに allowlist 化している
 *
 * ## 責務
 *
 * 1. `(periodSelection, elapsedDays, averageDailySales, storeIds)` を受け取る
 * 2. 内部で `buildFreePeriodFrame(periodSelection, storeIds, elapsedDays)` を
 *    useMemo で呼び frame を作る
 * 3. `useComparisonModule(periodSelection, elapsedDays, averageDailySales,
 *    frame.comparison)` の 4 引数版を呼ぶ
 * 4. ComparisonModule をそのまま返す
 *
 * これにより page-level caller は 3 引数 legacy signature を使わず、
 * `useComparisonModuleLegacyCallerGuard` の allowlist から削除できる。
 *
 * ## Phase 6b クローズまで
 *
 * 本 wrapper は Phase 6b 期間中の page-level 移行先。最終的に
 * `useComparisonModule` の periodSelection 依存が全て除去された時点で、
 * 本 wrapper の役割も見直される (scope 直接受領型に移行可能か評価する)。
 *
 * @responsibility R:orchestration
 */
import { useMemo } from 'react'
import type { PeriodSelection } from '@/domain/models/PeriodSelection'
import { buildFreePeriodFrame } from '@/domain/models/buildFreePeriodFrame'
import { useComparisonModule, type ComparisonModule } from '@/application/hooks/useComparisonModule'

/**
 * Page-level 用の comparison module hook。
 *
 * 内部で `buildFreePeriodFrame` から `frame.comparison` を構築し、4 引数版の
 * `useComparisonModule` に渡す。caller は従来の `useComparisonModule` と同じ
 * `ComparisonModule` 戻り値を受け取る。
 *
 * @param periodSelection 期間選択 (source of truth)
 * @param elapsedDays 当期の経過日数 (elapsedDays cap 用)
 * @param currentAverageDailySales 当期の日平均売上 (dowGap 用)
 * @param selectedStoreIds 対象店舗 ID 集合
 */
export function usePageComparisonModule(
  periodSelection: PeriodSelection,
  elapsedDays: number | undefined,
  currentAverageDailySales: number,
  selectedStoreIds: ReadonlySet<string>,
): ComparisonModule {
  const frame = useMemo(
    () => buildFreePeriodFrame(periodSelection, Array.from(selectedStoreIds).sort(), elapsedDays),
    [periodSelection, selectedStoreIds, elapsedDays],
  )
  return useComparisonModule(
    periodSelection,
    elapsedDays,
    currentAverageDailySales,
    frame.comparison,
  )
}
