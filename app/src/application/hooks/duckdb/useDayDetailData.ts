/**
 * 日別詳細データ取得フック
 *
 * カレンダーモーダルが必要とするDuckDBデータ（CTS・天気）を一括取得する。
 * 前年対応日の解決、isPrevYear フォールバック —
 * すべてこのフック内に閉じる。presentation/ は結果だけを受け取る。
 *
 * ## 設計原則
 * - UIは「この日のデータをくれ」と言うだけ
 * - 比較モード（同日/同曜日）の解釈はフック内で完結
 * - DuckDB の isPrevYear フラグの存在を UI は知らない
 *
 * ## Query Plan 委譲
 * 14 本のクエリ実行 + fallback 解決は useDayDetailPlan に委譲。
 * 本フックは日付範囲の計算（純粋関数）と plan 結果の組み立てのみ。
 *
 * @guard H1 Screen Plan 経由のみ
 * @responsibility R:query-exec
 */
import { useMemo } from 'react'
import { resolveDayDetailRanges } from './dayDetailDataLogic'
import type { DayDetailData, DayDetailDataParams } from './dayDetailDataLogic'
import { useDayDetailPlan } from '@/application/hooks/plans/useDayDetailPlan'

// 後方互換 re-export
export { resolveDayDetailRanges } from './dayDetailDataLogic'
export type {
  DayDetailData,
  DayDetailDataParams,
  WeatherCandidate,
  DaySummary,
} from './dayDetailDataLogic'

/**
 * 日別詳細に必要な全 DuckDB データを取得する。
 *
 * - CTS: 当日・前年当日・前週・累計当年・累計前年
 * - 天気: 当日・前年
 * - 前年対応日: comparisonScope.alignmentMode に基づいて resolvePrevDate で解決
 */
export function useDayDetailData(params: DayDetailDataParams): DayDetailData {
  const { queryExecutor, year, month, day, comparisonScope, selectedStoreIds, weatherStoreId } =
    params

  // 全日付範囲を一括計算（純粋関数 — useMemo 1つに集約）
  const ranges = useMemo(
    () => resolveDayDetailRanges(year, month, day, comparisonScope),
    [year, month, day, comparisonScope],
  )

  // クエリ実行 + fallback 解決を plan に委譲
  const plan = useDayDetailPlan(
    queryExecutor,
    ranges,
    selectedStoreIds,
    weatherStoreId,
    comparisonScope,
  )

  return {
    prevDate: ranges.prevDate,
    prevDateKey: ranges.prevDateKey,
    ...plan,
  }
}
