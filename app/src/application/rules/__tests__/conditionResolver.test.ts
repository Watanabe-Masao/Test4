import { describe, it, expect } from 'vitest'
import {
  resolveThresholds,
  isMetricEnabled,
  evaluateSignal,
} from '@/application/rules/conditionResolver'
import type { ConditionSummaryConfig } from '@/domain/models/ConditionConfig'

describe('conditionResolver', () => {
  describe('resolveThresholds', () => {
    it('returns registry defaults when no config override', () => {
      const config: ConditionSummaryConfig = { global: {}, storeOverrides: {} }
      const result = resolveThresholds(config, 'sales')
      // sales defaults: { blue: 1.0, yellow: 0.95, red: 0.9 }
      expect(result.blue).toBe(1.0)
      expect(result.yellow).toBe(0.95)
      expect(result.red).toBe(0.9)
    })

    it('applies global override onto defaults', () => {
      const config: ConditionSummaryConfig = {
        global: {
          sales: { thresholds: { blue: 1.1, yellow: 1.0 } },
        },
        storeOverrides: {},
      }
      const result = resolveThresholds(config, 'sales')
      expect(result.blue).toBe(1.1)
      expect(result.yellow).toBe(1.0)
      // red falls back to default
      expect(result.red).toBe(0.9)
    })

    it('store override takes precedence over global', () => {
      const config: ConditionSummaryConfig = {
        global: {
          sales: { thresholds: { blue: 1.1 } },
        },
        storeOverrides: {
          'store-1': { sales: { thresholds: { blue: 1.2 } } },
        },
      }
      const result = resolveThresholds(config, 'sales', 'store-1')
      expect(result.blue).toBe(1.2)
    })

    it('returns zero thresholds for unknown metric id', () => {
      const config: ConditionSummaryConfig = { global: {}, storeOverrides: {} }
      // unknown id cast
      const result = resolveThresholds(
        config,
        'unknownMetric' as unknown as 'sales',
      )
      expect(result.blue).toBe(0)
      expect(result.yellow).toBe(0)
      expect(result.red).toBe(0)
    })
  })

  describe('isMetricEnabled', () => {
    it('returns true by default', () => {
      const config: ConditionSummaryConfig = { global: {}, storeOverrides: {} }
      expect(isMetricEnabled(config, 'sales')).toBe(true)
    })

    it('honors global disabled', () => {
      const config: ConditionSummaryConfig = {
        global: { sales: { enabled: false } },
        storeOverrides: {},
      }
      expect(isMetricEnabled(config, 'sales')).toBe(false)
    })

    it('store override beats global', () => {
      const config: ConditionSummaryConfig = {
        global: { sales: { enabled: false } },
        storeOverrides: { 'store-1': { sales: { enabled: true } } },
      }
      expect(isMetricEnabled(config, 'sales', 'store-1')).toBe(true)
    })
  })

  describe('evaluateSignal', () => {
    const thresholds = { blue: 100, yellow: 80, red: 50 }

    it('higher_better: >= blue → blue', () => {
      expect(evaluateSignal(120, thresholds, 'higher_better')).toBe('blue')
      expect(evaluateSignal(100, thresholds, 'higher_better')).toBe('blue')
    })

    it('higher_better: >= yellow but < blue → yellow', () => {
      expect(evaluateSignal(90, thresholds, 'higher_better')).toBe('yellow')
    })

    it('higher_better: >= red but < yellow → red', () => {
      expect(evaluateSignal(60, thresholds, 'higher_better')).toBe('red')
    })

    it('higher_better: < red → warning', () => {
      expect(evaluateSignal(10, thresholds, 'higher_better')).toBe('warning')
    })

    it('lower_better: <= blue → blue', () => {
      const t = { blue: 10, yellow: 20, red: 30 }
      expect(evaluateSignal(5, t, 'lower_better')).toBe('blue')
      expect(evaluateSignal(10, t, 'lower_better')).toBe('blue')
    })

    it('lower_better: in yellow band → yellow', () => {
      const t = { blue: 10, yellow: 20, red: 30 }
      expect(evaluateSignal(15, t, 'lower_better')).toBe('yellow')
    })

    it('lower_better: in red band → red', () => {
      const t = { blue: 10, yellow: 20, red: 30 }
      expect(evaluateSignal(25, t, 'lower_better')).toBe('red')
    })

    it('lower_better: above red → warning', () => {
      const t = { blue: 10, yellow: 20, red: 30 }
      expect(evaluateSignal(100, t, 'lower_better')).toBe('warning')
    })
  })
})
