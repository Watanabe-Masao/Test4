import { describe, it, expect } from 'vitest'
import {
  applyFallbackRule,
  hasMetricWarning,
  resolveMetricValue,
  resolveMetric,
  getMetricOwner,
  getRegisteredMetricIds,
} from './metricResolver'

describe('applyFallbackRule', () => {
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

describe('hasMetricWarning', () => {
  it('warningRule に該当する警告がある場合 true', () => {
    const warnings = new Map([['discountLossCost', ['discount_rate_out_of_domain']]])
    expect(hasMetricWarning('discountLossCost', warnings)).toBe(true)
  })

  it('warningRule に該当しない警告の場合 false', () => {
    const warnings = new Map([['discountLossCost', ['some_other_warning']]])
    expect(hasMetricWarning('discountLossCost', warnings)).toBe(false)
  })

  it('警告が空の場合 false', () => {
    const warnings = new Map<string, readonly string[]>()
    expect(hasMetricWarning('discountLossCost', warnings)).toBe(false)
  })

  it('warningRule が未設定の指標は常に false', () => {
    const warnings = new Map([['salesTotal', ['some_warning']]])
    expect(hasMetricWarning('salesTotal', warnings)).toBe(false)
  })
})

describe('resolveMetricValue', () => {
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
    const warnings = new Map([['estMethodCogs', ['discount_rate_out_of_domain']]])
    const result = resolveMetricValue('estMethodCogs', 100000, warnings)
    expect(result.value).toBe(100000)
    expect(result.hasWarning).toBe(true)
    expect(result.owner).toBe('ts')
  })
})

describe('resolveMetric（強化版）', () => {
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
      const warnings = new Map([['estMethodCogs', ['discount_rate_out_of_domain']]])
      const result = resolveMetric('estMethodCogs', 100000, warnings)
      expect(result.status).toBe('invalid')
      expect(result.authoritativeAccepted).toBe(false)
      expect(result.exploratoryAllowed).toBe(false)
      expect(result.maxSeverity).toBe('critical')
    })

    it('warning severity → partial → exploratory 可、authoritative 不可', () => {
      const warnings = new Map([['estMethodCogs', ['markup_rate_negative']]])
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
        ['estMethodCogs', ['discount_rate_out_of_domain', 'markup_rate_negative']],
      ])
      const result = resolveMetric('estMethodCogs', 100000, warnings)
      expect(result.warnings).toEqual(['discount_rate_out_of_domain', 'markup_rate_negative'])
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
    // 登録済みの主要 KPI が含まれることを確認
    expect(ids).toContain('discountRate')
    expect(ids).toContain('invMethodCogs')
    expect(ids).toContain('estMethodCogs')
    expect(ids).toContain('discountLossCost')
    expect(ids).toContain('budgetAchievementRate')
    expect(ids).toContain('projectedSales')
    // 未登録の指標は含まれない
    expect(ids).not.toContain('salesTotal')
    expect(ids).not.toContain('totalCustomers')
  })
})
