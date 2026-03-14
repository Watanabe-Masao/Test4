import { describe, it, expect } from 'vitest'
import {
  applyFallbackRule,
  hasMetricWarning,
  resolveMetricValue,
  resolveMetric,
  resolveRawValue,
  evaluateWarnings,
  decideAcceptance,
  getMetricOwner,
  getRegisteredMetricIds,
} from './metricResolver'
import type { RawValueResolution, WarningEvaluation } from './metricResolver'

// ═══════════════════════════════════════════════════════════
// Stage 1: Raw Value Resolution
// ═══════════════════════════════════════════════════════════

describe('resolveRawValue (Stage 1)', () => {
  it('値がある場合はそのまま返す', () => {
    const result = resolveRawValue(100, 'zero')
    expect(result.value).toBe(100)
    expect(result.isFallback).toBe(false)
    expect(result.fallbackRule).toBe('zero')
  })

  it('0 はそのまま返す（fallback ではない）', () => {
    const result = resolveRawValue(0, 'null')
    expect(result.value).toBe(0)
    expect(result.isFallback).toBe(false)
  })

  it('zero ルール: null → 0', () => {
    expect(resolveRawValue(null, 'zero')).toEqual({
      value: 0,
      isFallback: true,
      fallbackRule: 'zero',
    })
  })

  it('zero ルール: undefined → 0', () => {
    expect(resolveRawValue(undefined, 'zero')).toEqual({
      value: 0,
      isFallback: true,
      fallbackRule: 'zero',
    })
  })

  it('null ルール: null → null', () => {
    expect(resolveRawValue(null, 'null')).toEqual({
      value: null,
      isFallback: true,
      fallbackRule: 'null',
    })
  })

  it('none ルール: null → null', () => {
    expect(resolveRawValue(null, 'none')).toEqual({
      value: null,
      isFallback: true,
      fallbackRule: 'none',
    })
  })

  it('estimated ルール: null → null', () => {
    expect(resolveRawValue(null, 'estimated')).toEqual({
      value: null,
      isFallback: true,
      fallbackRule: 'estimated',
    })
  })

  it('undefined ルール: null → null', () => {
    expect(resolveRawValue(null, undefined)).toEqual({
      value: null,
      isFallback: true,
      fallbackRule: undefined,
    })
  })
})

// ═══════════════════════════════════════════════════════════
// Stage 2: Warning Evaluation
// ═══════════════════════════════════════════════════════════

describe('evaluateWarnings (Stage 2)', () => {
  it('warningRule に該当する警告がある場合', () => {
    const warnings = new Map([['discountLossCost', ['calc_discount_rate_out_of_domain']]])
    const result = evaluateWarnings('discountLossCost', warnings)
    expect(result.matchesWarningRule).toBe(true)
    expect(result.warnings).toEqual(['calc_discount_rate_out_of_domain'])
    expect(result.maxSeverity).toBe('critical')
  })

  it('warningRule に該当しない警告の場合', () => {
    const warnings = new Map([['discountLossCost', ['some_other_warning']]])
    const result = evaluateWarnings('discountLossCost', warnings)
    expect(result.matchesWarningRule).toBe(false)
    expect(result.warnings).toEqual(['some_other_warning'])
    expect(result.maxSeverity).toBe('warning') // unknown code → default warning
  })

  it('警告が空の場合', () => {
    const result = evaluateWarnings('discountLossCost', new Map())
    expect(result.matchesWarningRule).toBe(false)
    expect(result.warnings).toEqual([])
    expect(result.maxSeverity).toBeNull()
  })

  it('warningRule が未設定の指標は matchesWarningRule=false', () => {
    const warnings = new Map([['salesTotal', ['some_warning']]])
    const result = evaluateWarnings('salesTotal', warnings)
    expect(result.matchesWarningRule).toBe(false)
    expect(result.warnings).toEqual(['some_warning'])
  })

  it('複数 warning の maxSeverity', () => {
    const warnings = new Map([
      ['estMethodCogs', ['calc_markup_rate_negative', 'calc_discount_rate_out_of_domain']],
    ])
    const result = evaluateWarnings('estMethodCogs', warnings)
    expect(result.maxSeverity).toBe('critical')
    expect(result.warnings).toHaveLength(2)
  })
})

// ═══════════════════════════════════════════════════════════
// Stage 3: Acceptance Decision
// ═══════════════════════════════════════════════════════════

describe('decideAcceptance (Stage 3)', () => {
  const noWarning: WarningEvaluation = {
    warnings: [],
    maxSeverity: null,
    matchesWarningRule: false,
  }

  const criticalWarning: WarningEvaluation = {
    warnings: ['calc_discount_rate_out_of_domain'],
    maxSeverity: 'critical',
    matchesWarningRule: true,
  }

  const warningOnly: WarningEvaluation = {
    warnings: ['calc_markup_rate_negative'],
    maxSeverity: 'warning',
    matchesWarningRule: false,
  }

  it('正常値 → ok, authoritative 可', () => {
    const raw: RawValueResolution = { value: 100, isFallback: false, fallbackRule: 'zero' }
    const result = decideAcceptance(raw, noWarning)
    expect(result.status).toBe('ok')
    expect(result.authoritativeAccepted).toBe(true)
    expect(result.exploratoryAllowed).toBe(true)
  })

  it('fallback=zero で null → fallback, authoritative 可', () => {
    const raw: RawValueResolution = { value: 0, isFallback: true, fallbackRule: 'zero' }
    const result = decideAcceptance(raw, noWarning)
    expect(result.status).toBe('fallback')
    expect(result.authoritativeAccepted).toBe(true)
  })

  it('fallback=null で null → invalid, authoritative 不可', () => {
    const raw: RawValueResolution = { value: null, isFallback: true, fallbackRule: 'null' }
    const result = decideAcceptance(raw, noWarning)
    expect(result.status).toBe('invalid')
    expect(result.authoritativeAccepted).toBe(false)
    expect(result.exploratoryAllowed).toBe(false)
  })

  it('fallback=estimated → estimated, authoritative 不可', () => {
    const raw: RawValueResolution = { value: null, isFallback: true, fallbackRule: 'estimated' }
    const result = decideAcceptance(raw, noWarning)
    expect(result.status).toBe('estimated')
    expect(result.authoritativeAccepted).toBe(false)
    expect(result.exploratoryAllowed).toBe(true)
  })

  it('critical warning → invalid', () => {
    const raw: RawValueResolution = { value: 100, isFallback: false, fallbackRule: undefined }
    const result = decideAcceptance(raw, criticalWarning)
    expect(result.status).toBe('invalid')
    expect(result.authoritativeAccepted).toBe(false)
    expect(result.exploratoryAllowed).toBe(false)
  })

  it('warning severity → partial, exploratory 可', () => {
    const raw: RawValueResolution = { value: 100, isFallback: false, fallbackRule: undefined }
    const result = decideAcceptance(raw, warningOnly)
    expect(result.status).toBe('partial')
    expect(result.authoritativeAccepted).toBe(false)
    expect(result.exploratoryAllowed).toBe(true)
  })

  it('calculationStatus=invalid が最優先', () => {
    const raw: RawValueResolution = { value: 100, isFallback: false, fallbackRule: 'zero' }
    const result = decideAcceptance(raw, noWarning, 'invalid')
    expect(result.status).toBe('invalid')
    expect(result.authoritativeAccepted).toBe(false)
  })

  it('calculationStatus=partial が最優先', () => {
    const raw: RawValueResolution = { value: 100, isFallback: false, fallbackRule: 'zero' }
    const result = decideAcceptance(raw, noWarning, 'partial')
    expect(result.status).toBe('partial')
    expect(result.authoritativeAccepted).toBe(false)
    expect(result.exploratoryAllowed).toBe(true)
  })

  it('calculationStatus=estimated が最優先', () => {
    const raw: RawValueResolution = { value: 100, isFallback: false, fallbackRule: 'zero' }
    const result = decideAcceptance(raw, noWarning, 'estimated')
    expect(result.status).toBe('estimated')
  })

  it('値が null で fallback なし → invalid', () => {
    const raw: RawValueResolution = { value: null, isFallback: false, fallbackRule: undefined }
    const result = decideAcceptance(raw, noWarning)
    expect(result.status).toBe('invalid')
  })
})

// ═══════════════════════════════════════════════════════════
// 後方互換 API
// ═══════════════════════════════════════════════════════════

describe('applyFallbackRule（後方互換）', () => {
  it('値がある場合はそのまま返す', () => {
    expect(applyFallbackRule(100, 'zero')).toEqual({ value: 100, isFallback: false })
    expect(applyFallbackRule(0, 'null')).toEqual({ value: 0, isFallback: false })
  })

  it('zero ルール: null → 0', () => {
    expect(applyFallbackRule(null, 'zero')).toEqual({ value: 0, isFallback: true })
    expect(applyFallbackRule(undefined, 'zero')).toEqual({ value: 0, isFallback: true })
  })

  it('null ルール: null → null', () => {
    expect(applyFallbackRule(null, 'null')).toEqual({ value: null, isFallback: true })
  })

  it('none ルール: null → null', () => {
    expect(applyFallbackRule(null, 'none')).toEqual({ value: null, isFallback: true })
  })

  it('undefined ルール: null → null', () => {
    expect(applyFallbackRule(null, undefined)).toEqual({ value: null, isFallback: true })
  })
})

describe('hasMetricWarning（後方互換）', () => {
  it('warningRule に該当する警告がある場合 true', () => {
    const warnings = new Map([['discountLossCost', ['calc_discount_rate_out_of_domain']]])
    expect(hasMetricWarning('discountLossCost', warnings)).toBe(true)
  })

  it('warningRule に該当しない警告の場合 false', () => {
    const warnings = new Map([['discountLossCost', ['some_other_warning']]])
    expect(hasMetricWarning('discountLossCost', warnings)).toBe(false)
  })

  it('警告が空の場合 false', () => {
    expect(hasMetricWarning('discountLossCost', new Map())).toBe(false)
  })

  it('warningRule が未設定の指標は常に false', () => {
    const warnings = new Map([['salesTotal', ['some_warning']]])
    expect(hasMetricWarning('salesTotal', warnings)).toBe(false)
  })
})

describe('resolveMetricValue（後方互換）', () => {
  it('正常値: fallback なし、warning なし', () => {
    const result = resolveMetricValue('discountRate', 0.02, new Map())
    expect(result.value).toBe(0.02)
    expect(result.isFallback).toBe(false)
    expect(result.hasWarning).toBe(false)
    expect(result.owner).toBe('ts')
  })

  it('null 値 + fallbackRule=zero → 0 にフォールバック', () => {
    const result = resolveMetricValue('discountRate', null, new Map())
    expect(result.value).toBe(0)
    expect(result.isFallback).toBe(true)
  })

  it('null 値 + fallbackRule=null → null のまま', () => {
    const result = resolveMetricValue('invMethodCogs', null, new Map())
    expect(result.value).toBeNull()
    expect(result.isFallback).toBe(true)
  })

  it('warningRule に該当する警告がある場合', () => {
    const warnings = new Map([['estMethodCogs', ['calc_discount_rate_out_of_domain']]])
    const result = resolveMetricValue('estMethodCogs', 100000, warnings)
    expect(result.value).toBe(100000)
    expect(result.hasWarning).toBe(true)
    expect(result.owner).toBe('ts')
  })
})

// ═══════════════════════════════════════════════════════════
// 統合: resolveMetric
// ═══════════════════════════════════════════════════════════

describe('resolveMetric（統合）', () => {
  describe('authoritative 採用可否', () => {
    it('正常値 → authoritative 採用可', () => {
      const result = resolveMetric('discountRate', 0.05, new Map())
      expect(result.status).toBe('ok')
      expect(result.authoritativeAccepted).toBe(true)
      expect(result.exploratoryAllowed).toBe(true)
      expect(result.warnings).toEqual([])
    })

    it('fallbackRule=zero で null → authoritative 採用可（0 は妥当な業務値）', () => {
      const result = resolveMetric('discountRate', null, new Map())
      expect(result.value).toBe(0)
      expect(result.status).toBe('fallback')
      expect(result.authoritativeAccepted).toBe(true)
      expect(result.isFallback).toBe(true)
    })

    it('fallbackRule=null で null → authoritative 不可', () => {
      const result = resolveMetric('invMethodCogs', null, new Map())
      expect(result.value).toBeNull()
      expect(result.status).toBe('invalid')
      expect(result.authoritativeAccepted).toBe(false)
      expect(result.exploratoryAllowed).toBe(false)
    })

    it('critical warning → invalid → authoritative 不可', () => {
      const warnings = new Map([['estMethodCogs', ['calc_discount_rate_out_of_domain']]])
      const result = resolveMetric('estMethodCogs', 100000, warnings)
      expect(result.status).toBe('invalid')
      expect(result.authoritativeAccepted).toBe(false)
      expect(result.exploratoryAllowed).toBe(false)
      expect(result.maxSeverity).toBe('critical')
    })

    it('warning severity → partial → exploratory 可、authoritative 不可', () => {
      const warnings = new Map([['estMethodCogs', ['calc_markup_rate_negative']]])
      const result = resolveMetric('estMethodCogs', 100000, warnings)
      expect(result.status).toBe('partial')
      expect(result.authoritativeAccepted).toBe(false)
      expect(result.exploratoryAllowed).toBe(true)
      expect(result.maxSeverity).toBe('warning')
    })
  })

  describe('calculationStatus 直接渡し', () => {
    it('calculationStatus=invalid → invalid', () => {
      const result = resolveMetric('discountRate', 0.05, new Map(), 'invalid')
      expect(result.status).toBe('invalid')
      expect(result.authoritativeAccepted).toBe(false)
    })

    it('calculationStatus=partial → partial', () => {
      const result = resolveMetric('discountRate', 0.05, new Map(), 'partial')
      expect(result.status).toBe('partial')
      expect(result.authoritativeAccepted).toBe(false)
      expect(result.exploratoryAllowed).toBe(true)
    })

    it('calculationStatus=estimated → estimated', () => {
      const result = resolveMetric('discountRate', 0.05, new Map(), 'estimated')
      expect(result.status).toBe('estimated')
      expect(result.authoritativeAccepted).toBe(false)
      expect(result.exploratoryAllowed).toBe(true)
    })
  })

  describe('owner 情報', () => {
    it('authoritativeOwner が設定された指標', () => {
      const result = resolveMetric('invMethodCogs', 50000, new Map())
      expect(result.owner).toBe('ts')
    })

    it('authoritativeOwner が未設定の指標', () => {
      const result = resolveMetric('salesTotal', 1000000, new Map())
      expect(result.owner).toBeUndefined()
    })
  })

  describe('warning 情報', () => {
    it('警告なし → 空配列', () => {
      const result = resolveMetric('discountRate', 0.05, new Map())
      expect(result.warnings).toEqual([])
      expect(result.maxSeverity).toBeNull()
    })

    it('警告あり → コード一覧と maxSeverity', () => {
      const warnings = new Map([
        ['estMethodCogs', ['calc_discount_rate_out_of_domain', 'calc_markup_rate_negative']],
      ])
      const result = resolveMetric('estMethodCogs', 100000, warnings)
      expect(result.warnings).toEqual([
        'calc_discount_rate_out_of_domain',
        'calc_markup_rate_negative',
      ])
      expect(result.maxSeverity).toBe('critical')
    })
  })
})

describe('getMetricOwner', () => {
  it('authoritativeOwner が設定されている指標', () => {
    expect(getMetricOwner('discountRate')).toBe('ts')
    expect(getMetricOwner('invMethodCogs')).toBe('ts')
  })

  it('authoritativeOwner が未設定の指標', () => {
    expect(getMetricOwner('salesTotal')).toBeUndefined()
  })
})

describe('getRegisteredMetricIds', () => {
  it('authoritativeOwner が設定された指標のみ返す', () => {
    const ids = getRegisteredMetricIds()
    expect(ids.length).toBeGreaterThan(0)
    expect(ids).toContain('discountRate')
    expect(ids).toContain('invMethodCogs')
    expect(ids).toContain('estMethodCogs')
    expect(ids).toContain('discountLossCost')
    expect(ids).toContain('budgetAchievementRate')
    expect(ids).toContain('projectedSales')
    expect(ids).not.toContain('salesTotal')
    expect(ids).not.toContain('totalCustomers')
  })
})
