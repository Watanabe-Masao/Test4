import { describe, it, expect } from 'vitest'
import {
  applyFallbackRule,
  hasMetricWarning,
  resolveMetricValue,
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
