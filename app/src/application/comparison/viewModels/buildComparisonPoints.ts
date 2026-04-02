/**
 * ComparisonPoint ビルダー
 *
 * dailyMapping (DayMappingRow[]) → ComparisonPoint[] への変換。
 * buildSameDowPoints を内部で使い、sorted array を返す。
 *
 * 複数の widget で同じ変換パターンが繰り返されていたのを共通化。
 */
import type { DayMappingRow } from '@/application/comparison/comparisonTypes'
import { buildSameDowPoints } from '@/application/comparison/comparisonTypes'
import type { ComparisonPoint } from './ComparisonViewTypes'

/**
 * DayMappingRow[] → ComparisonPoint[] に変換（currentDay でソート済み）。
 *
 * 各 widget で `buildSameDowPoints` + Map → sorted array の定型パターンを共通化。
 */
export function toComparisonPoints(
  dailyMapping: readonly DayMappingRow[],
): readonly ComparisonPoint[] {
  const map = buildSameDowPoints(dailyMapping)
  return [...map.values()].sort((a, b) => a.currentDay - b.currentDay)
}

/**
 * DayMappingRow[] → Map<currentDay, ComparisonPoint> に変換。
 *
 * 日別ルックアップが必要な場合（曜日平均、週別サマリー等）に使用。
 */
export function toComparisonPointMap(
  dailyMapping: readonly DayMappingRow[],
): ReadonlyMap<number, ComparisonPoint> {
  return buildSameDowPoints(dailyMapping)
}
