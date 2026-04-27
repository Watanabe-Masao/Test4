/**
 * YoYChart の Screen Plan input を構築する pure builder。
 *
 * unify-period-analysis Phase 5 (ViewModel / chart 薄化): YoYChart.tsx が
 * `scope?.effectivePeriod1` / `effectivePeriod2` / `alignmentMode` を直接
 * 読んでいた箇所を本 builder に移し、presentation 層を chart 薄化する。
 *
 * @responsibility R:unclassified
 *
 * ## 設計方針
 *
 * - **pure function**: React hooks / store / side effect を一切持たない
 * - **application 層に配置**: ComparisonScope 内部フィールドへのアクセスは
 *   application 層の責務であり、`comparisonResolvedRangeSurfaceGuard`
 *   (presentation 層だけをスキャン) の対象外
 * - **YoyDailyInput 組み立て 1 箇所集約**: 旧 YoYChart.tsx の useMemo 内で
 *   行っていた当期/比較期の DateRange → dateKey 変換、prevYearScope fallback、
 *   storeIds 空集合の扱い、alignmentMode 変換を本 builder にまとめる
 *
 * ## 入力の意味
 *
 * - `scope`: `ComparisonScope | null` — scope が null のとき null を返す
 *   （chart 側では「データなし」として処理される）
 * - `prevYearScope`: 比較期日付範囲の優先 source。存在する場合は
 *   `scope.effectivePeriod2` より優先される。JS 集計経路と DuckDB クエリ経路の
 *   前年範囲整合性を維持するため
 * - `selectedStoreIds`: 対象店舗 ID 集合。空集合のときは undefined を返す
 *   (= 全店対象)
 *
 * ## 将来展望
 *
 * Phase 6 で `useComparisonModule` を `ComparisonScope` 直接受領に書き換える
 * 際、本 builder の input 型を `ComparisonResolvedRange` + current DateRange
 * へ移行する。現段階は ComparisonScope を直接受け取る形で十分。
 */
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/calendar'
import type { ComparisonScope, AlignmentMode } from '@/domain/models/ComparisonScope'
import type { YoyDailyInput } from '@/application/queries/comparison/YoyDailyHandler'

/** `AlignmentMode` を YoyDailyHandler が期待する `CompareModeV2` に変換する */
function toCompareMode(mode: AlignmentMode | undefined): 'sameDate' | 'sameDayOfWeek' {
  if (mode === 'sameDayOfWeek') return 'sameDayOfWeek'
  return 'sameDate'
}

/**
 * `ComparisonScope` + `PrevYearScope` + 店舗集合から `YoyDailyInput` を構築する。
 *
 * @returns 比較に必要な scope が揃っていれば `YoyDailyInput`、不足していれば `null`
 */
export function buildYoyDailyInput(
  scope: ComparisonScope | null,
  prevYearScope: PrevYearScope | undefined,
  selectedStoreIds: ReadonlySet<string>,
): YoyDailyInput | null {
  if (!scope) return null

  const currentRange: DateRange = scope.effectivePeriod1
  const prevRange: DateRange = prevYearScope?.dateRange ?? scope.effectivePeriod2

  if (!currentRange || !prevRange) return null

  const cur = dateRangeToKeys(currentRange)
  const prev = dateRangeToKeys(prevRange)

  return {
    curDateFrom: cur.fromKey,
    curDateTo: cur.toKey,
    prevDateFrom: prev.fromKey,
    prevDateTo: prev.toKey,
    storeIds: selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined,
    compareMode: toCompareMode(scope.alignmentMode),
  }
}
