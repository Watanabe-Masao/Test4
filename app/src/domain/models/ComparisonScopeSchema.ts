/**
 * ComparisonScope の Zod runtime 契約
 *
 * buildComparisonScope() の出力を runtime 検証する。
 * 比較解決の正本性を保証する唯一の契約。
 *
 * @responsibility R:unclassified
 */
import { z } from 'zod'

const CalendarDateSchema = z.object({
  year: z.number(),
  month: z.number().min(1).max(12),
  day: z.number().min(1).max(31),
})

const DateRangeSchema = z.object({
  from: CalendarDateSchema,
  to: CalendarDateSchema,
})

const QueryMonthSchema = z.object({
  year: z.number(),
  month: z.number().min(1).max(12),
})

const AlignmentEntrySchema = z.object({
  currentDate: CalendarDateSchema,
  sourceDate: CalendarDateSchema,
})

export const ComparisonScopeSchema = z.object({
  period1: DateRangeSchema,
  period2: DateRangeSchema,
  preset: z.string(),
  alignmentMode: z.enum(['sameDate', 'sameDayOfWeek']),
  dowOffset: z.number().min(0).max(6),
  effectivePeriod1: DateRangeSchema,
  effectivePeriod2: DateRangeSchema,
  queryRanges: z.array(QueryMonthSchema),
  alignmentMap: z.array(AlignmentEntrySchema),
  sourceMonth: QueryMonthSchema,
})

export type ComparisonScopeSchema = z.infer<typeof ComparisonScopeSchema>
