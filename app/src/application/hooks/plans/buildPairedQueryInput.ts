// Paired (current + optional comparison) query input pure builder
//
// unify-period-analysis Phase 5 横展開 第 2 バッチ: 残る chart/hook が全て
// PairedQueryInput 系 (当期 + optional 比較期) のパターンを持つため、
// buildBaseQueryInput の「1 range 版」に対応する「2 range 版」共通 builder。
//
// 対象:
//   - FactorDecompositionPanel.tsx (PairedInput<StoreDaySummaryInput>)
//   - useDeptHourlyChartData.ts (PairedInput<HourlyAggregationInput>)
//   - useCategoryHierarchyData.ts (PairedInput<LevelAggregationInput>
//     / PairedInput<CategoryHourlyInput>)
//
// ## 設計方針
//
// - **1 range 版との整合**: 内部で buildBaseQueryInput を呼び、当期部分の
//   責務 (dateFrom/dateTo/storeIds 正規化) を共通化する
// - **null 伝播**: currentDateRange が nullish なら null を返す
// - **prev は optional**: prevYearDateRange が nullish なら base を返し、
//   comparisonDateFrom/To は付与しない (handler 側で current のみ実行される)
// - **pure function**: React hooks / store / side effect を一切持たない
//
// ## 追加フィールドの扱い
//
// PairedInput<T extends BaseQueryInput> は T 固有の追加フィールド
// (deptCode, lineCode, level 等) を持つことがある。本 builder は
// BaseQueryInput + paired fields のみを構築するので、caller 側で spread して
// 拡張フィールドを乗せる:
//
// ```ts
// const base = buildPairedQueryInput(cur, prev, storeIds)
// if (!base) return null
// const input: PairedInput<HourlyAggregationInput> = {
//   ...base,
//   level: drill.level,
//   deptCode: drill.deptCode,
//   lineCode: drill.lineCode,
// }
// ```
//
// ## Chart Input Builder Pattern
//
// 本 builder は references/03-guides/chart-input-builder-pattern.md で定義
// された Pattern の 2 range 拡張版。chartInputBuilderGuard が presentation
// 配下での dateRangeToKeys 直接呼び出しを禁止しているため、PairedInput を
// 作る chart/hook は本 builder を経由する必要がある。
//
// @responsibility R:unclassified
import type { DateRange } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/calendar'
import type { PairedQueryInput } from '@/application/queries/PairedQueryContract'
import { buildBaseQueryInput } from './buildBaseQueryInput'

/**
 * PairedQueryInput を current + optional prev range + storeIds から構築する。
 *
 * @param currentDateRange 当期日付範囲。null / undefined なら null を返す
 * @param prevYearDateRange 比較期日付範囲。nullish なら comparison なし
 *   (`PairedQueryInput` の `comparisonDateFrom/To` が undefined のまま)
 * @param selectedStoreIds 対象店舗 ID 集合。空集合なら `storeIds: undefined`
 * @returns 組み立てられた `PairedQueryInput`、または currentDateRange 欠落時は null
 */
export function buildPairedQueryInput(
  currentDateRange: DateRange | null | undefined,
  prevYearDateRange: DateRange | null | undefined,
  selectedStoreIds: ReadonlySet<string>,
): PairedQueryInput | null {
  const base = buildBaseQueryInput(currentDateRange, selectedStoreIds)
  if (!base) return null
  if (!prevYearDateRange) return base
  const { fromKey: pFrom, toKey: pTo } = dateRangeToKeys(prevYearDateRange)
  return { ...base, comparisonDateFrom: pFrom, comparisonDateTo: pTo }
}
