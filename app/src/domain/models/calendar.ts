/**
 * カレンダー・日付・比較型エクスポート
 */
export type { CalendarDate, DateRange, DateKey } from './CalendarDate'
export {
  toDateKey,
  toDateKeyFromParts,
  fromDateKey,
  getDow,
  formatCalendarDate,
  isSameDate,
  dateRangeDays,
  dateRangeToKeys,
} from './CalendarDate'
export type { AlignmentPolicy, ComparisonFrame, PrevYearScope } from './ComparisonFrame'
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
  buildPrevYearScopeFromSelection,
} from './PeriodSelection'
