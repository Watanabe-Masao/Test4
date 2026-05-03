/**
 * BaseQueryInput を currentDateRange + storeIds から構築する共通 pure builder。
 *
 * unify-period-analysis Phase 5 横展開: 複数の chart が次の同一パターンで
 * query input を組み立てていた:
 *
 * ```tsx
 * const input = useMemo<XxxInput | null>(() => {
 *   const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
 *   return {
 *     dateFrom: fromKey,
 *     dateTo: toKey,
 *     storeIds: selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined,
 *   }
 * }, [currentDateRange, selectedStoreIds])
 * ```
 *
 * 対象の Input 型は全て `BaseQueryInput`（= `DateRangeFilter` +
 * `StoreFilter`）を継承しており、shape が完全に同一。本 builder 1 本で
 * 5 chart 分（WeatherAnalysisPanel / DowPatternChart / CumulativeChart /
 * FeatureChart / StoreHourlyChart）の input 組み立てを吸収する。
 *
 * ## 設計方針
 *
 * - **pure function**: React hooks / store / side effect を一切持たない
 * - **null 安全**: currentDateRange が null / undefined なら null を返す
 * - **store id 正規化**: 空集合なら undefined（= 全店対象、既存 chart と同じ挙動）
 * - **共通化**: 個別 chart ごとに build<Name>Input.ts を作らない。
 *   chart-specific な追加フィールドが必要な chart（例: StoreAggregationInput の
 *   deptCode / lineCode）は本 builder の結果に spread して拡張する
 *
 * ## Chart Input Builder Pattern
 *
 * 本 builder は `references/03-implementation/chart-input-builder-pattern.md` で
 * 定義された Pattern の Phase 5 横展開版。`chartInputBuilderGuard` が
 * presentation/components/charts/ 配下での `dateRangeToKeys` 直接呼び出しを
 * 禁止しているため、chart は本 builder を経由する必要がある。
 *
 * 見本実装: `YoYChart.tsx` + `buildYoyDailyInput.ts`（comparison 付き）、
 *           `WeatherAnalysisPanel.tsx` 等 + `buildBaseQueryInput.ts`（本 builder）
 *
 * @responsibility R:unclassified
 */
import type { DateRange } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/calendar'
import type { BaseQueryInput } from '@/application/queries/QueryContract'

/**
 * `BaseQueryInput` を組み立てる共通 pure builder。
 *
 * @param currentDateRange 対象日付範囲。null / undefined なら null を返す
 * @param selectedStoreIds 対象店舗 ID 集合。空集合なら `storeIds: undefined`
 * @returns 組み立てられた `BaseQueryInput`、または currentDateRange 欠落時は null
 */
export function buildBaseQueryInput(
  currentDateRange: DateRange | null | undefined,
  selectedStoreIds: ReadonlySet<string>,
): BaseQueryInput | null {
  if (!currentDateRange) return null
  const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
  return {
    dateFrom: fromKey,
    dateTo: toKey,
    storeIds: selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined,
  }
}
