/**
 * 比較期間のラベル定数
 *
 * preset ごとの p1/p2 ラベルを一元管理する。
 * チャート側で「前年」「前期」「比較」などを独自に付けない。
 *
 * @see references/01-principles/dual-period-definition.md
 * @responsibility R:unclassified
 */
import type { ComparisonPreset } from '@/domain/models/PeriodSelection'

export const PERIOD_LABELS: Readonly<Record<ComparisonPreset, { p1: string; p2: string }>> = {
  prevYearSameMonth: { p1: '当期', p2: '前年同月' },
  prevYearSameDow: { p1: '当期', p2: '前年同曜日' },
  prevMonth: { p1: '当期', p2: '前月' },
  prevWeek: { p1: '当期', p2: '前週' },
  prevYearNextWeek: { p1: '当期', p2: '前年翌週' },
  custom: { p1: '期間1', p2: '期間2' },
} as const

/**
 * チャートが受け取る比較入力の props 型。
 *
 * チャートは useDualPeriodRange() を直接呼ばず、
 * ページから ChartPeriodProps を props として受け取る。
 */
export interface ChartPeriodProps {
  readonly rangeStart: number
  readonly rangeEnd: number
  readonly p2Start: number
  readonly p2End: number
  readonly comparisonEnabled: boolean
  readonly p1Label: string
  readonly p2Label: string
}
