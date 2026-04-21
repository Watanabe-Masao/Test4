/**
 * カレンダー・日付・比較型エクスポート
 */
export type { CalendarDate, DateRange, DateKey } from './CalendarDate'
export {
  toDateKey,
  toDateKey as formatCalendarDate,
  toDateKeyFromParts,
  fromDateKey,
  getDow,
  toJsDate,
  fromJsDate,
  weekNumber,
  isSameDate,
  dateRangeDays,
  dateRangeToKeys,
} from './CalendarDate'
export type { MonthDayChunk } from './DateRangeChunks'
export { splitDateRangeByMonth } from './DateRangeChunks'
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
