/**
 * 同曜日オフセット計算ユーティリティ
 *
 * 月初の曜日差分から DOW オフセットを算出する純粋関数。
 * resolveComparisonFrame.ts から分離。
 */

/**
 * 月初の曜日差分からオフセットを算出する。
 *
 * 当年 month/1 の曜日 - 前年 month/1 の曜日。
 * 前年の day を (day - offset) にマッピングすると当年の同曜日に対応する。
 */
export function calcSameDowOffset(
  year: number,
  month: number,
  sourceYear?: number,
  sourceMonth?: number,
): number {
  const sy = sourceYear ?? year - 1
  const sm = sourceMonth ?? month
  if (isNaN(year) || isNaN(month) || isNaN(sy) || isNaN(sm)) return 0
  const currentDow = new Date(year, month - 1, 1).getDay()
  const prevDow = new Date(sy, sm - 1, 1).getDay()
  const result = (((currentDow - prevDow) % 7) + 7) % 7
  return isNaN(result) ? 0 : result
}
