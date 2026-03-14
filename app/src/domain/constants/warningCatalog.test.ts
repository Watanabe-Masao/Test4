import { describe, it, expect } from 'vitest'
import {
  getWarningEntry,
  getWarningLabel,
  getWarningMessage,
  getWarningSeverity,
  resolveWarnings,
  getMaxSeverity,
} from './warningCatalog'

describe('getWarningEntry', () => {
  it('登録済み code → WarningEntry を返す', () => {
    const entry = getWarningEntry('discount_rate_negative')
    expect(entry).not.toBeNull()
    expect(entry!.code).toBe('discount_rate_negative')
    expect(entry!.severity).toBe('critical')
    expect(entry!.label).toBeTruthy()
    expect(entry!.message).toBeTruthy()
  })

  it('未登録 code → null', () => {
    expect(getWarningEntry('unknown_code')).toBeNull()
  })
})

describe('getWarningLabel', () => {
  it('登録済み code → ラベルを返す', () => {
    expect(getWarningLabel('discount_rate_out_of_domain')).toBe('売変率定義域外')
  })

  it('未登録 code → code そのものを返す', () => {
    expect(getWarningLabel('unknown_code')).toBe('unknown_code')
  })
})

describe('getWarningMessage', () => {
  it('登録済み code → メッセージを返す', () => {
    const msg = getWarningMessage('markup_rate_negative')
    expect(msg).toContain('値入率が負')
  })

  it('未登録 code → code そのものを返す', () => {
    expect(getWarningMessage('unknown_code')).toBe('unknown_code')
  })
})

describe('getWarningSeverity', () => {
  it('critical コード', () => {
    expect(getWarningSeverity('discount_rate_negative')).toBe('critical')
    expect(getWarningSeverity('discount_rate_out_of_domain')).toBe('critical')
  })

  it('warning コード', () => {
    expect(getWarningSeverity('markup_rate_negative')).toBe('warning')
    expect(getWarningSeverity('markup_rate_exceeds_one')).toBe('warning')
  })

  it('未登録 code → デフォルト warning', () => {
    expect(getWarningSeverity('unknown_code')).toBe('warning')
  })
})

describe('resolveWarnings', () => {
  it('複数 code を解決する', () => {
    const resolved = resolveWarnings(['discount_rate_negative', 'markup_rate_negative'])
    expect(resolved).toHaveLength(2)
    expect(resolved[0].code).toBe('discount_rate_negative')
    expect(resolved[0].severity).toBe('critical')
    expect(resolved[0].resolved).toBe(true)
    expect(resolved[1].code).toBe('markup_rate_negative')
    expect(resolved[1].severity).toBe('warning')
  })

  it('未登録 code も解決される（デフォルト値）', () => {
    const resolved = resolveWarnings(['unknown_code'])
    expect(resolved[0].code).toBe('unknown_code')
    expect(resolved[0].severity).toBe('warning')
    expect(resolved[0].label).toBe('unknown_code')
  })

  it('空配列 → 空配列', () => {
    expect(resolveWarnings([])).toEqual([])
  })
})

describe('getMaxSeverity', () => {
  it('critical が含まれる → critical', () => {
    expect(getMaxSeverity(['markup_rate_negative', 'discount_rate_negative'])).toBe('critical')
  })

  it('warning のみ → warning', () => {
    expect(getMaxSeverity(['markup_rate_negative', 'markup_rate_exceeds_one'])).toBe('warning')
  })

  it('空配列 → null', () => {
    expect(getMaxSeverity([])).toBeNull()
  })

  it('未登録 code → デフォルト warning', () => {
    expect(getMaxSeverity(['unknown_code'])).toBe('warning')
  })
})
