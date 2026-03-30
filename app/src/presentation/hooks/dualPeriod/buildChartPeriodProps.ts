/**
 * ページレベルで ChartPeriodProps を構築する。
 *
 * useDualPeriodRange() の結果と periodSelectionStore の preset から、
 * チャートに配布する統一入力を生成する。
 */
import type { DualPeriodRangeResult } from '@/presentation/components/charts/useDualPeriodRange'
import type { ComparisonPreset } from '@/domain/models/PeriodSelection'
import { PERIOD_LABELS, type ChartPeriodProps } from './periodLabels'

export function buildChartPeriodProps(
  range: DualPeriodRangeResult,
  activePreset: ComparisonPreset,
): ChartPeriodProps {
  const labels = PERIOD_LABELS[activePreset]
  return {
    rangeStart: range.p1Start,
    rangeEnd: range.p1End,
    p2Start: range.p2Start,
    p2End: range.p2End,
    comparisonEnabled: range.p2Enabled,
    p1Label: labels.p1,
    p2Label: labels.p2,
  }
}
