/**
 * 期間比較（Period Comparison）プリミティブ
 *
 * 前年比（YoY）・前週比（WoW）などは本質的に「2つの期間の比較」である。
 * 下流が ratio と diff を個別に計算する代わりにこの構造体を使う。
 * ゼロ除算処理・差分計算が1箇所に集約される。
 *
 * @example
 * // Before（下流が個別に計算）:
 * const ratio = prevSales !== 0 ? curSales / prevSales : 0
 * const diff = curSales - prevSales
 *
 * // After（domain compose）:
 * const comparison = comparePeriods(curSales, prevSales)
 * // comparison.ratio, comparison.difference が使える
 *
 * // YoY 用エイリアス（既存コードとの互換）:
 * const yoy = compareYoY(curSales, prevSales)
 *
 * @responsibility R:unclassified
 */
import { safeDivide } from '@/domain/calculations/utils'

/**
 * 期間比較の結果
 *
 * 前年比・前週比・予算比など、2つの数値を比較する全てのケースで使用。
 * 「前年」「前週」という名前は便宜上の区別であり、構造は同一。
 */
export interface PeriodComparison {
  /** 当期値 */
  readonly current: number
  /** 比較対象期間の値 */
  readonly reference: number
  /** 差分（current - reference） */
  readonly difference: number
  /** 比率（current / reference）。reference=0 の場合 0 */
  readonly ratio: number
  /** 成長率（(current - reference) / reference）。reference=0 の場合 0 */
  readonly growthRate: number
}

/**
 * 2つの期間の値を比較する
 *
 * @param current 当期値
 * @param reference 比較対象期間の値
 * @returns ratio, difference, growthRate を含む比較結果
 *
 * @invariant result.difference === result.current - result.reference
 * @invariant result.ratio === result.current / result.reference（reference≠0 の場合）
 * @invariant result.growthRate === result.ratio - 1（reference≠0 の場合）
 */
export function comparePeriods(current: number, reference: number): PeriodComparison {
  return {
    current,
    reference,
    difference: current - reference,
    ratio: safeDivide(current, reference, 0),
    growthRate: safeDivide(current - reference, reference, 0),
  }
}

/** 比較対象期間のデータが有意か（比較データが存在するか） */
export function hasReferenceData(comparison: PeriodComparison): boolean {
  return comparison.reference !== 0
}
