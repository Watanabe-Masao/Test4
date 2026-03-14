import { describe, it, expect } from 'vitest'
import {
  getWarningEntry,
  getWarningLabel,
  getWarningMessage,
  getWarningSeverity,
  getWarningCategory,
  resolveWarnings,
  getMaxSeverity,
  getAllWarningCodes,
} from './warningCatalog'

describe('命名規則', () => {
  it('全 code がカテゴリ接頭辞で始まる', () => {
    const validPrefixes = ['calc_', 'obs_', 'cmp_', 'fb_', 'auth_']
    for (const code of getAllWarningCodes()) {
      const hasValidPrefix = validPrefixes.some((p) => code.startsWith(p))
      expect(hasValidPrefix, `${code} はカテゴリ接頭辞がありません`).toBe(true)
    }
  })

  it('全 code が lowercase snake_case', () => {
    for (const code of getAllWarningCodes()) {
      expect(code).toMatch(/^[a-z][a-z0-9_]*$/)
    }
  })
})

describe('getWarningEntry', () => {
  it('登録済み code → WarningEntry を返す', () => {
    const entry = getWarningEntry('calc_discount_rate_negative')
    expect(entry).not.toBeNull()
    expect(entry!.code).toBe('calc_discount_rate_negative')
    expect(entry!.category).toBe('calc')
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
    expect(getWarningLabel('calc_discount_rate_out_of_domain')).toBe('売変率定義域外')
  })

  it('未登録 code → code そのものを返す', () => {
    expect(getWarningLabel('unknown_code')).toBe('unknown_code')
  })
})

describe('getWarningMessage', () => {
  it('登録済み code → メッセージを返す', () => {
    const msg = getWarningMessage('calc_markup_rate_negative')
    expect(msg).toContain('値入率が負')
  })

  it('未登録 code → code そのものを返す', () => {
    expect(getWarningMessage('unknown_code')).toBe('unknown_code')
  })
})

describe('getWarningSeverity', () => {
  it('critical コード', () => {
    expect(getWarningSeverity('calc_discount_rate_negative')).toBe('critical')
    expect(getWarningSeverity('calc_discount_rate_out_of_domain')).toBe('critical')
  })

  it('warning コード', () => {
    expect(getWarningSeverity('calc_markup_rate_negative')).toBe('warning')
    expect(getWarningSeverity('calc_markup_rate_exceeds_one')).toBe('warning')
    expect(getWarningSeverity('obs_window_incomplete')).toBe('warning')
    expect(getWarningSeverity('cmp_prior_year_insufficient')).toBe('warning')
  })

  it('info コード', () => {
    expect(getWarningSeverity('fb_estimated_value_used')).toBe('info')
    expect(getWarningSeverity('auth_partial_rejected')).toBe('info')
  })

  it('未登録 code → デフォルト warning', () => {
    expect(getWarningSeverity('unknown_code')).toBe('warning')
  })
})

describe('getWarningCategory', () => {
  it('登録済み code → category を返す', () => {
    expect(getWarningCategory('calc_discount_rate_negative')).toBe('calc')
    expect(getWarningCategory('obs_window_incomplete')).toBe('obs')
    expect(getWarningCategory('cmp_prior_year_insufficient')).toBe('cmp')
    expect(getWarningCategory('fb_estimated_value_used')).toBe('fb')
    expect(getWarningCategory('auth_partial_rejected')).toBe('auth')
  })

  it('未登録 code でも接頭辞から推定', () => {
    expect(getWarningCategory('calc_unknown')).toBe('calc')
    expect(getWarningCategory('obs_unknown')).toBe('obs')
  })

  it('接頭辞なしの未登録 code → デフォルト calc', () => {
    expect(getWarningCategory('unknown_code')).toBe('calc')
  })
})

describe('resolveWarnings', () => {
  it('複数 code を解決する', () => {
    const resolved = resolveWarnings(['calc_discount_rate_negative', 'calc_markup_rate_negative'])
    expect(resolved).toHaveLength(2)
    expect(resolved[0].code).toBe('calc_discount_rate_negative')
    expect(resolved[0].severity).toBe('critical')
    expect(resolved[0].category).toBe('calc')
    expect(resolved[0].resolved).toBe(true)
    expect(resolved[1].code).toBe('calc_markup_rate_negative')
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
    expect(getMaxSeverity(['calc_markup_rate_negative', 'calc_discount_rate_negative'])).toBe(
      'critical',
    )
  })

  it('warning のみ → warning', () => {
    expect(getMaxSeverity(['calc_markup_rate_negative', 'calc_markup_rate_exceeds_one'])).toBe(
      'warning',
    )
  })

  it('info のみ → info', () => {
    expect(getMaxSeverity(['fb_estimated_value_used', 'auth_partial_rejected'])).toBe('info')
  })

  it('空配列 → null', () => {
    expect(getMaxSeverity([])).toBeNull()
  })

  it('未登録 code → デフォルト warning', () => {
    expect(getMaxSeverity(['unknown_code'])).toBe('warning')
  })
})

describe('分類体系カバレッジ', () => {
  it('calc / obs / cmp / fb / auth の5系統が存在する', () => {
    const codes = getAllWarningCodes()
    const categories = new Set(codes.map((c) => c.split('_')[0]))
    expect(categories).toContain('calc')
    expect(categories).toContain('obs')
    expect(categories).toContain('cmp')
    expect(categories).toContain('fb')
    expect(categories).toContain('auth')
  })
})

describe('カタログ整合性', () => {
  it('全 code の category が接頭辞と一致する', () => {
    for (const code of getAllWarningCodes()) {
      const entry = getWarningEntry(code)!
      const prefixCategory = code.split('_')[0]
      expect(entry.category, `${code} の category と接頭辞が不一致`).toBe(prefixCategory)
    }
  })

  it('全 code に label と message が設定されている', () => {
    for (const code of getAllWarningCodes()) {
      const entry = getWarningEntry(code)!
      expect(entry.label.length, `${code} の label が空`).toBeGreaterThan(0)
      expect(entry.message.length, `${code} の message が空`).toBeGreaterThan(0)
    }
  })

  it('label に UI 記号（⚠, ❌ 等）が含まれない', () => {
    for (const code of getAllWarningCodes()) {
      const entry = getWarningEntry(code)!
      expect(entry.label, `${code} の label に UI 記号が含まれています`).not.toMatch(/[⚠❌✓✗🔴🟡]/u)
    }
  })

  it('code に UI 文言が混入していない（日本語を含まない）', () => {
    for (const code of getAllWarningCodes()) {
      expect(code, `${code} に日本語が含まれています`).toMatch(/^[a-z0-9_]+$/)
    }
  })

  it('severity は info / warning / critical のいずれか', () => {
    const validSeverities = ['info', 'warning', 'critical']
    for (const code of getAllWarningCodes()) {
      const entry = getWarningEntry(code)!
      expect(validSeverities, `${code} の severity が不正: ${entry.severity}`).toContain(
        entry.severity,
      )
    }
  })

  it('category は calc / obs / cmp / fb / auth のいずれか', () => {
    const validCategories = ['calc', 'obs', 'cmp', 'fb', 'auth']
    for (const code of getAllWarningCodes()) {
      const entry = getWarningEntry(code)!
      expect(validCategories, `${code} の category が不正: ${entry.category}`).toContain(
        entry.category,
      )
    }
  })
})
