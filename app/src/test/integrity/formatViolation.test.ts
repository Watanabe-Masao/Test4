/**
 * Integrity Domain — formatViolation primitive unit tests
 *
 * Phase B Step B-2 で landing した `formatViolations` / `formatStringViolations` の
 * 動作と純粋性を fixture string で完結する形で検証。
 *
 * @taxonomyKind T:meta-guard
 * @responsibility R:guard
 */
import { describe, it, expect } from 'vitest'
import { formatViolations, formatStringViolations, type DriftReport } from '@app-domain/integrity'

describe('reporting/formatViolations', () => {
  it('違反 0 件で空文字を返す', () => {
    expect(formatViolations([])).toBe('')
  })

  it('1 件の violation を多行で出力 (header + 詳細 + hint)', () => {
    const v: DriftReport = {
      ruleId: 'AR-X',
      severity: 'gate',
      location: 'foo.md:10',
      expected: 'A',
      actual: 'B',
      fixHint: 'fix it',
    }
    const out = formatViolations([v])
    expect(out).toContain('違反 (1 件):')
    expect(out).toContain('[gate] AR-X @ foo.md:10')
    expect(out).toContain('expected: A')
    expect(out).toContain('actual:   B')
    expect(out).toContain('hint:     fix it')
  })

  it('fixHint が無い場合 hint 行を出さない', () => {
    const v: DriftReport = {
      ruleId: 'AR-X',
      severity: 'warn',
      location: 'bar',
      expected: 'a',
      actual: 'b',
    }
    const out = formatViolations([v])
    expect(out).not.toContain('hint:')
  })

  it('複数 violation の件数 header が正しい', () => {
    const v: DriftReport = {
      ruleId: 'AR-X',
      severity: 'gate',
      location: 'x',
      expected: 'a',
      actual: 'b',
    }
    expect(formatViolations([v, v, v])).toContain('違反 (3 件):')
  })
})

describe('reporting/formatStringViolations', () => {
  it('違反 0 件で空文字', () => {
    expect(formatStringViolations([])).toBe('')
  })

  it('bullet list として出力', () => {
    const out = formatStringViolations(['fileA', 'fileB'])
    expect(out).toContain('違反 (2 件):')
    expect(out).toContain('  - fileA')
    expect(out).toContain('  - fileB')
  })
})
