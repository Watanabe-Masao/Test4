/**
 * conditionResolver テスト
 *
 * 3層マージ（レジストリ → グローバル → 店舗オーバーライド）と
 * シグナル評価（higher_better / lower_better）を検証する。
 */
import { describe, it, expect } from 'vitest'
import { resolveThresholds, isMetricEnabled, evaluateSignal } from '../conditionResolver'
import type { ConditionSummaryConfig, ThresholdSet } from '@/domain/models/ConditionConfig'
import { DEFAULT_CONDITION_CONFIG } from '@/domain/constants/conditionMetrics'

// ─── resolveThresholds ──────────────────────────────────

describe('resolveThresholds', () => {
  it('未知のメトリクスIDにはゼロフォールバック', () => {
    const result = resolveThresholds(DEFAULT_CONDITION_CONFIG, 'unknownMetric' as never)
    expect(result).toEqual({ blue: 0, yellow: 0, red: 0 })
  })

  it('デフォルト設定ではレジストリのデフォルト値を返す', () => {
    const result = resolveThresholds(DEFAULT_CONDITION_CONFIG, 'gpRate')
    expect(result).toEqual({ blue: 0.2, yellow: -0.2, red: -0.5 })
  })

  it('グローバル設定がレジストリデフォルトを上書きする', () => {
    const config: ConditionSummaryConfig = {
      global: {
        gpRate: { thresholds: { blue: 0.5, yellow: 0.1 } },
      },
      storeOverrides: {},
    }
    const result = resolveThresholds(config, 'gpRate')
    // blue, yellow はグローバルから、red はレジストリデフォルト
    expect(result).toEqual({ blue: 0.5, yellow: 0.1, red: -0.5 })
  })

  it('店舗オーバーライドがグローバルを上書きする', () => {
    const config: ConditionSummaryConfig = {
      global: {
        gpRate: { thresholds: { blue: 0.5, yellow: 0.1, red: -0.3 } },
      },
      storeOverrides: {
        store01: {
          gpRate: { thresholds: { blue: 0.8 } },
        },
      },
    }
    const result = resolveThresholds(config, 'gpRate', 'store01')
    // blue は店舗から、yellow/red はグローバルから
    expect(result).toEqual({ blue: 0.8, yellow: 0.1, red: -0.3 })
  })

  it('storeId 未指定時は店舗オーバーライドを適用しない', () => {
    const config: ConditionSummaryConfig = {
      global: {},
      storeOverrides: {
        store01: {
          gpRate: { thresholds: { blue: 999 } },
        },
      },
    }
    const result = resolveThresholds(config, 'gpRate')
    // レジストリデフォルト（店舗オーバーライドは無視）
    expect(result).toEqual({ blue: 0.2, yellow: -0.2, red: -0.5 })
  })

  it('該当店舗のオーバーライドがない場合はグローバル→レジストリにフォールバック', () => {
    const config: ConditionSummaryConfig = {
      global: { gpRate: { thresholds: { yellow: 0.0 } } },
      storeOverrides: {
        store99: { gpRate: { thresholds: { blue: 999 } } },
      },
    }
    const result = resolveThresholds(config, 'gpRate', 'store01')
    // store01 にはオーバーライドなし → global.yellow + registry blue/red
    expect(result).toEqual({ blue: 0.2, yellow: 0.0, red: -0.5 })
  })

  it('lower_better メトリクス（discountRate）のデフォルト閾値', () => {
    const result = resolveThresholds(DEFAULT_CONDITION_CONFIG, 'discountRate')
    expect(result).toEqual({ blue: 0.02, yellow: 0.025, red: 0.03 })
  })
})

// ─── isMetricEnabled ────────────────────────────────────

describe('isMetricEnabled', () => {
  it('設定なしではデフォルトで有効', () => {
    expect(isMetricEnabled(DEFAULT_CONDITION_CONFIG, 'gpRate')).toBe(true)
  })

  it('グローバルで無効化できる', () => {
    const config: ConditionSummaryConfig = {
      global: { gpRate: { enabled: false } },
      storeOverrides: {},
    }
    expect(isMetricEnabled(config, 'gpRate')).toBe(false)
  })

  it('店舗オーバーライドがグローバルの無効化を上書きできる', () => {
    const config: ConditionSummaryConfig = {
      global: { gpRate: { enabled: false } },
      storeOverrides: {
        store01: { gpRate: { enabled: true } },
      },
    }
    expect(isMetricEnabled(config, 'gpRate', 'store01')).toBe(true)
  })

  it('店舗オーバーライドで無効化できる', () => {
    const config: ConditionSummaryConfig = {
      global: { gpRate: { enabled: true } },
      storeOverrides: {
        store01: { gpRate: { enabled: false } },
      },
    }
    expect(isMetricEnabled(config, 'gpRate', 'store01')).toBe(false)
  })
})

// ─── evaluateSignal ─────────────────────────────────────

describe('evaluateSignal', () => {
  const thresholds: ThresholdSet = { blue: 1.0, yellow: 0.95, red: 0.9 }

  describe('higher_better', () => {
    it('blue 以上 → blue', () => {
      expect(evaluateSignal(1.0, thresholds, 'higher_better')).toBe('blue')
      expect(evaluateSignal(1.5, thresholds, 'higher_better')).toBe('blue')
    })

    it('yellow 以上 blue 未満 → yellow', () => {
      expect(evaluateSignal(0.95, thresholds, 'higher_better')).toBe('yellow')
      expect(evaluateSignal(0.99, thresholds, 'higher_better')).toBe('yellow')
    })

    it('red 以上 yellow 未満 → red', () => {
      expect(evaluateSignal(0.9, thresholds, 'higher_better')).toBe('red')
      expect(evaluateSignal(0.94, thresholds, 'higher_better')).toBe('red')
    })

    it('red 未満 → warning', () => {
      expect(evaluateSignal(0.89, thresholds, 'higher_better')).toBe('warning')
      expect(evaluateSignal(0, thresholds, 'higher_better')).toBe('warning')
    })
  })

  describe('lower_better', () => {
    const lowThresholds: ThresholdSet = { blue: 0.02, yellow: 0.025, red: 0.03 }

    it('blue 以下 → blue', () => {
      expect(evaluateSignal(0.02, lowThresholds, 'lower_better')).toBe('blue')
      expect(evaluateSignal(0.01, lowThresholds, 'lower_better')).toBe('blue')
    })

    it('yellow 以下 blue 超 → yellow', () => {
      expect(evaluateSignal(0.025, lowThresholds, 'lower_better')).toBe('yellow')
      expect(evaluateSignal(0.021, lowThresholds, 'lower_better')).toBe('yellow')
    })

    it('red 以下 yellow 超 → red', () => {
      expect(evaluateSignal(0.03, lowThresholds, 'lower_better')).toBe('red')
      expect(evaluateSignal(0.026, lowThresholds, 'lower_better')).toBe('red')
    })

    it('red 超 → warning', () => {
      expect(evaluateSignal(0.031, lowThresholds, 'lower_better')).toBe('warning')
      expect(evaluateSignal(1.0, lowThresholds, 'lower_better')).toBe('warning')
    })
  })

  it('境界値: 閾値ちょうどの値', () => {
    // higher_better: 閾値ちょうど = その閾値レベル
    expect(evaluateSignal(1.0, thresholds, 'higher_better')).toBe('blue')
    expect(evaluateSignal(0.95, thresholds, 'higher_better')).toBe('yellow')
    expect(evaluateSignal(0.9, thresholds, 'higher_better')).toBe('red')
  })
})
