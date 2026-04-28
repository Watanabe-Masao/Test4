/**
 * Integrity Domain — temporal primitive unit tests
 *
 * Phase B Step B-5 で landing。Date を caller 注入する形で純粋性確保。
 *
 * @taxonomyKind T:meta-guard
 * @responsibility R:guard
 */
import { describe, it, expect } from 'vitest'
import {
  checkExpired,
  checkFreshness,
  type ExpiringItem,
  type FreshnessTarget,
} from '@app-domain/integrity'

describe('detection/checkExpired', () => {
  const opts = { ruleId: 'AR-EXP', itemLabel: 'allowlist' }
  const now = new Date('2026-04-28')

  it('expiresAt 未来で違反 0', () => {
    const items: ExpiringItem[] = [{ id: 'foo', expiresAt: '2099-01-01' }]
    expect(checkExpired(items, now, opts)).toEqual([])
  })

  it('expiresAt 過去で違反', () => {
    const items: ExpiringItem[] = [{ id: 'foo', expiresAt: '2025-01-01' }]
    const r = checkExpired(items, now, opts)
    expect(r).toHaveLength(1)
    expect(r[0].location).toBe('allowlist: foo')
    expect(r[0].actual).toContain('expired')
  })

  it('expiresAt invalid date は無視 (NaN)', () => {
    const items: ExpiringItem[] = [{ id: 'foo', expiresAt: 'invalid' }]
    expect(checkExpired(items, now, opts)).toEqual([])
  })

  it('境界: 同日 (gt なので fail にしない、gte ではない)', () => {
    const items: ExpiringItem[] = [{ id: 'foo', expiresAt: '2026-04-28' }]
    // 同日 00:00:00 vs 00:00:00 → equal、gt なので 0
    expect(checkExpired(items, new Date('2026-04-28T00:00:00Z'), opts)).toEqual([])
  })
})

describe('detection/checkFreshness', () => {
  const opts = { ruleId: 'AR-FRESH', itemLabel: 'spec' }
  const now = new Date('2026-04-28')

  it('cadence 未経過で違反 0', () => {
    const targets: FreshnessTarget[] = [
      { id: 'WID-001', lastReviewedAt: '2026-03-01', cadenceDays: 90 },
    ]
    expect(checkFreshness(targets, now, opts)).toEqual([])
  })

  it('cadence 超過で stale 検出', () => {
    const targets: FreshnessTarget[] = [
      { id: 'WID-001', lastReviewedAt: '2025-01-01', cadenceDays: 90 },
    ]
    const r = checkFreshness(targets, now, opts)
    expect(r).toHaveLength(1)
    expect(r[0].actual).toContain('日前')
    expect(r[0].severity).toBe('warn') // default
  })

  it('lastReviewedAt invalid は無視', () => {
    const targets: FreshnessTarget[] = [
      { id: 'WID-001', lastReviewedAt: 'invalid', cadenceDays: 90 },
    ]
    expect(checkFreshness(targets, now, opts)).toEqual([])
  })

  it('複数 target の混在 (一部 stale、一部 fresh)', () => {
    const targets: FreshnessTarget[] = [
      { id: 'A', lastReviewedAt: '2025-01-01', cadenceDays: 90 }, // stale
      { id: 'B', lastReviewedAt: '2026-04-01', cadenceDays: 90 }, // fresh
      { id: 'C', lastReviewedAt: '2024-01-01', cadenceDays: 30 }, // stale
    ]
    const r = checkFreshness(targets, now, opts)
    expect(r.map((v) => v.location)).toEqual(['spec: A', 'spec: C'])
  })
})
