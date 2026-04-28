/**
 * Integrity Domain — ratchet primitive unit tests
 *
 * Phase B Step B-5 で landing。
 *
 * @taxonomyKind T:meta-guard
 * @responsibility R:guard
 */
import { describe, it, expect } from 'vitest'
import { checkRatchet } from '@app-domain/integrity'

describe('detection/checkRatchet', () => {
  const opts = { ruleId: 'AR-Z', counterLabel: 'foo', baseline: 5 }

  it('current === baseline で ok', () => {
    const r = checkRatchet(5, opts)
    expect(r.status).toBe('ok')
    expect(r.violations).toEqual([])
  })

  it('current > baseline で over + violation 1 件', () => {
    const r = checkRatchet(7, opts)
    expect(r.status).toBe('over')
    expect(r.violations).toHaveLength(1)
    expect(r.violations[0].actual).toContain('= 7')
    expect(r.violations[0].actual).toContain('+2')
    expect(r.violations[0].severity).toBe('ratchet-down')
  })

  it('current < baseline で reduced + ratchetDownHint', () => {
    const r = checkRatchet(3, opts)
    expect(r.status).toBe('reduced')
    expect(r.violations).toEqual([])
    expect(r.ratchetDownHint).toContain('5 → 3')
    expect(r.ratchetDownHint).toContain('baseline を 3 に更新')
  })

  it('severity injection が反映される', () => {
    const r = checkRatchet(10, { ...opts, severity: 'gate' })
    expect(r.violations[0].severity).toBe('gate')
  })
})
