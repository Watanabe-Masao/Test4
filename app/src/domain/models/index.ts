/**
 * domain/models バレル — サブバレルから re-export
 *
 * 新規コードは具体的なサブバレルから直接 import を推奨:
 *   import type { DailyRecord } from '@/domain/models/record'
 *   import type { StoreResult } from '@/domain/models/store'
 *   import type { CalendarDate } from '@/domain/models/calendar'
 *   import type { MetricId } from '@/domain/models/analysis'
 * @sunsetCondition 本 barrel は永続的構造（モジュール entry point / 後方互換 re-export）
 * @expiresAt 2099-12-31
 * @reason ADR-C-004 / F1 原則: モジュール entry の後方互換 barrel re-export
 *
 * @responsibility R:unclassified
 */
export * from './record'
export * from './storeTypes'
export * from './calendar'
export * from './analysis'
export * from './CalculationResult'
export * from './ImportResult'
export * from './DepartmentKpiIndex'
