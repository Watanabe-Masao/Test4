/**
 * domain/models バレル — サブバレルから re-export
 *
 * 新規コードは具体的なサブバレルから直接 import を推奨:
 *   import type { DailyRecord } from '@/domain/models/record'
 *   import type { StoreResult } from '@/domain/models/store'
 *   import type { CalendarDate } from '@/domain/models/calendar'
 *   import type { MetricId } from '@/domain/models/analysis'
 */
export * from './record'
export * from './storeTypes'
export * from './calendar'
export * from './analysis'
export * from './CalculationResult'
export * from './ImportResult'
export * from './DepartmentKpiIndex'
