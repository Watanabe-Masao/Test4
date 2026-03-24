/**
 * カレンダー・日付・比較型エクスポート
 */
export type { CalendarDate, DateRange, DateKey, MonthDayChunk } from './CalendarDate'
export {
  toDateKey,
  toDateKeyFromParts,
  fromDateKey,
  getDow,
  formatCalendarDate,
  isSameDate,
  dateRangeDays,
  dateRangeToKeys,
  splitDateRangeByMonth,
} from './CalendarDate'
export type { DowDayCount, DowGapAnalysis } from './ComparisonContext'
export type {
  ComparisonPreset,
  PeriodSelection,
  AdjacentMonths,
  PeriodQueryInput,
} from './PeriodSelection'
export {
  calcAdjacentMonths,
  buildPeriodQueryInput,
  applyPreset,
  createDefaultPeriodSelection,
  deriveDowOffset,
  deriveEffectivePeriod2,
  buildPrevYearScopeFromSelection,
} from './PeriodSelection'
export type {
  AlignmentEntry,
  AlignmentMode,
  QueryMonth,
  ComparisonScope,
  PrevYearScope,
} from './ComparisonScope'
export { buildComparisonScope, resolvePrevDate } from './ComparisonScope'
