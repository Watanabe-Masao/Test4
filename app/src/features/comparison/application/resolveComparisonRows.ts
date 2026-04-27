/**
 * Resolver 本体 — current row ごとに compare row を確定する
 *
 * ## 責務
 *
 * - requested compare dateKey を算出（comparisonRules に委譲）
 * - previous index から exact lookup
 * - 1件 → matched / 0件 → missing_previous / 2件以上 → ambiguous_previous
 *
 * ## 出力順序
 *
 * 返却配列は currentRows の入力順に一致する。追加ソートしない。
 * ordering responsibility は upstream に置く。
 *
 * ## 設計原則
 *
 * - 欠損は欠損のまま（auto-fallback しない）
 * - 重複は ambiguous として表面化（silent sum しない）
 * - alignmentKey は requestedCompareDateKey ベース（missing でもキーが安定）
 *
 * @responsibility R:unclassified
 */
import type { CompareModeV2, MatchableRow, ResolvedComparisonRow } from './comparisonTypes'
import { resolveRequestedCompareDateKey } from './comparisonRules'
import { buildComparisonIndex } from './comparisonIndex'
import {
  toMappingKind,
  createProvenance,
  createFallbackProvenance,
} from '../domain/comparisonProvenance'

function makeAlignmentKey(
  storeId: string,
  grainKey: string | undefined,
  currentDateKey: string,
  requestedCompareDateKey: string,
  compareMode: CompareModeV2,
): string {
  return `${storeId}|${grainKey ?? ''}|${currentDateKey}|${requestedCompareDateKey}|${compareMode}`
}

/**
 * current rows と previous rows から比較先を確定した canonical rows を生成する。
 *
 * @param currentRows 当期の行（入力順が保持される）
 * @param previousRows 比較期の候補行
 * @param compareMode 比較モード
 * @returns 入力順を保持した ResolvedComparisonRow[]
 */
export function resolveComparisonRows(
  currentRows: readonly MatchableRow[],
  previousRows: readonly MatchableRow[],
  compareMode: CompareModeV2,
): ResolvedComparisonRow[] {
  const prevIndex = buildComparisonIndex(previousRows)

  return currentRows.map((cur) => {
    const requestedCompareDateKey = resolveRequestedCompareDateKey(cur, compareMode)
    const matches = prevIndex.get(cur.storeId, requestedCompareDateKey, cur.grainKey)

    const baseFields = {
      compareMode,
      alignmentKey: makeAlignmentKey(
        cur.storeId,
        cur.grainKey,
        cur.dateKey,
        requestedCompareDateKey,
        compareMode,
      ),
      storeId: cur.storeId,
      grainKey: cur.grainKey,
      currentDateKey: cur.dateKey,
      requestedCompareDateKey,
      currentSales: cur.sales,
      currentCustomers: cur.customers,
    }

    const mappingKind = toMappingKind(compareMode)

    if (matches.length === 0) {
      return {
        ...baseFields,
        compareDateKey: null,
        compareSales: null,
        compareCustomers: null,
        status: 'missing_previous' as const,
        provenance: createFallbackProvenance(
          requestedCompareDateKey,
          mappingKind,
          'No matching comparison date',
        ),
      }
    }

    if (matches.length > 1) {
      return {
        ...baseFields,
        compareDateKey: null,
        compareSales: null,
        compareCustomers: null,
        status: 'ambiguous_previous' as const,
        provenance: createFallbackProvenance(
          requestedCompareDateKey,
          mappingKind,
          `Multiple matches found (${matches.length})`,
        ),
      }
    }

    const prev = matches[0]
    return {
      ...baseFields,
      compareDateKey: prev.dateKey,
      compareSales: prev.sales,
      compareCustomers: prev.customers,
      status: 'matched' as const,
      provenance: createProvenance(prev.dateKey, mappingKind),
    }
  })
}
