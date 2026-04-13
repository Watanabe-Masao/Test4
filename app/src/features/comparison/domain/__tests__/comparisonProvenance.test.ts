import { describe, it, expect } from 'vitest'
import {
  toMappingKind,
  createProvenance,
  createFallbackProvenance,
} from '@/features/comparison/domain/comparisonProvenance'

describe('toMappingKind', () => {
  it('maps sameDate → same-date', () => {
    expect(toMappingKind('sameDate')).toBe('same-date')
  })

  it('maps sameDayOfWeek → same-dow', () => {
    expect(toMappingKind('sameDayOfWeek')).toBe('same-dow')
  })

  it('maps prevMonth → same-date', () => {
    expect(toMappingKind('prevMonth')).toBe('same-date')
  })
})

describe('createProvenance', () => {
  it('creates a provenance with confidence 1.0 and no fallback', () => {
    const p = createProvenance('2025-01-15', 'same-date')
    expect(p).toEqual({
      sourceDate: '2025-01-15',
      mappingKind: 'same-date',
      fallbackApplied: false,
      confidence: 1.0,
    })
  })

  it('supports all mapping kinds', () => {
    for (const kind of ['same-date', 'same-dow', 'wow', 'custom-offset'] as const) {
      const p = createProvenance('2025-06-01', kind)
      expect(p.mappingKind).toBe(kind)
      expect(p.fallbackApplied).toBe(false)
      expect(p.confidence).toBe(1.0)
      expect(p.fallbackReason).toBeUndefined()
    }
  })

  it('preserves the given sourceDate verbatim', () => {
    expect(createProvenance('2026-12-31', 'wow').sourceDate).toBe('2026-12-31')
  })
})

describe('createFallbackProvenance', () => {
  it('creates a provenance with fallback applied and lowered confidence', () => {
    const p = createFallbackProvenance('2025-01-15', 'same-dow', 'prev year data missing')
    expect(p).toEqual({
      sourceDate: '2025-01-15',
      mappingKind: 'same-dow',
      fallbackApplied: true,
      fallbackReason: 'prev year data missing',
      confidence: 0.7,
    })
  })

  it('sets fallbackApplied=true regardless of reason', () => {
    const p = createFallbackProvenance('2025-02-01', 'wow', '')
    expect(p.fallbackApplied).toBe(true)
    expect(p.fallbackReason).toBe('')
    expect(p.confidence).toBe(0.7)
  })

  it('preserves the fallback reason verbatim', () => {
    const reason = 'duckdb unavailable, switched to etrn'
    const p = createFallbackProvenance('2025-03-10', 'custom-offset', reason)
    expect(p.fallbackReason).toBe(reason)
  })
})
