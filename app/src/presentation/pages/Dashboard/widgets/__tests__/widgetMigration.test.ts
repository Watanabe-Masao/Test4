import { describe, it, expect } from 'vitest'
import {
  migrateWidgetIds,
  WIDGET_ID_MIGRATION,
} from '@/presentation/pages/Dashboard/widgets/widgetMigration'

describe('WIDGET_ID_MIGRATION map', () => {
  it('maps legacy duckdb-timeslot to chart-timeslot-sales', () => {
    expect(WIDGET_ID_MIGRATION.get('duckdb-timeslot')).toBe('chart-timeslot-sales')
  })

  it('maps multiple daily-kpi variants to widget-budget-achievement', () => {
    expect(WIDGET_ID_MIGRATION.get('daily-kpi-sales')).toBe('widget-budget-achievement')
    expect(WIDGET_ID_MIGRATION.get('daily-kpi-cost')).toBe('widget-budget-achievement')
    expect(WIDGET_ID_MIGRATION.get('kpi-core-sales')).toBe('widget-budget-achievement')
    expect(WIDGET_ID_MIGRATION.get('exec-summary-bar')).toBe('widget-budget-achievement')
  })

  it('returns undefined for unknown legacy ids', () => {
    expect(WIDGET_ID_MIGRATION.get('unknown-id')).toBeUndefined()
  })

  it('has at least 20 migration entries', () => {
    expect(WIDGET_ID_MIGRATION.size).toBeGreaterThan(20)
  })
})

describe('migrateWidgetIds', () => {
  it('returns ids unchanged when no migration applies', () => {
    const result = migrateWidgetIds(['chart-daily-sales', 'analysis-waterfall'])
    expect(result).toEqual(['chart-daily-sales', 'analysis-waterfall'])
  })

  it('migrates a single legacy id', () => {
    const result = migrateWidgetIds(['duckdb-timeslot'])
    expect(result).toEqual(['chart-timeslot-sales'])
  })

  it('deduplicates after migration when multiple legacy ids map to same target', () => {
    const result = migrateWidgetIds([
      'daily-kpi-sales',
      'daily-kpi-cost',
      'daily-kpi-discount',
    ])
    expect(result).toEqual(['widget-budget-achievement'])
  })

  it('preserves input order for first occurrence', () => {
    const result = migrateWidgetIds([
      'chart-daily-sales',
      'duckdb-timeslot',
      'analysis-waterfall',
    ])
    expect(result).toEqual(['chart-daily-sales', 'chart-timeslot-sales', 'analysis-waterfall'])
  })

  it('deduplicates when an already-migrated id appears alongside its target', () => {
    const result = migrateWidgetIds(['chart-timeslot-sales', 'duckdb-timeslot'])
    expect(result).toEqual(['chart-timeslot-sales'])
  })

  it('returns empty array for empty input', () => {
    expect(migrateWidgetIds([])).toEqual([])
  })

  it('deduplicates duplicate non-legacy ids', () => {
    const result = migrateWidgetIds(['chart-daily-sales', 'chart-daily-sales'])
    expect(result).toEqual(['chart-daily-sales'])
  })

  it('handles mix of legacy duplicates and non-legacy duplicates', () => {
    const result = migrateWidgetIds([
      'kpi-core-sales',
      'kpi-total-cost',
      'chart-daily-sales',
      'chart-daily-sales',
    ])
    expect(result).toEqual(['widget-budget-achievement', 'chart-daily-sales'])
  })
})
