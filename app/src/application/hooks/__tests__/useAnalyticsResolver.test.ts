import { describe, it, expect } from 'vitest'
import {
  buildSourceContext,
  resolveTimeSeriesSource,
  resolveYoYSource,
  resolveDuckDBOnlySource,
} from '../useAnalyticsResolver'
import type { SourceContext } from '../useAnalyticsResolver'
import type { Store } from '@/domain/models'

// ── Helpers ──────────────────────────────────────────

function makeSourceContext(overrides: Partial<SourceContext> = {}): SourceContext {
  return {
    duckConn: null,
    duckDataVersion: 0,
    duckLoadedMonthCount: 0,
    storeCount: 1,
    hasPrevYear: false,
    ...overrides,
  }
}

/** Minimal mock that satisfies the duckConn non-null check */
const FAKE_CONN = {} as SourceContext['duckConn']

function readyContext(overrides: Partial<SourceContext> = {}): SourceContext {
  return makeSourceContext({
    duckConn: FAKE_CONN,
    duckDataVersion: 1,
    duckLoadedMonthCount: 3,
    storeCount: 5,
    hasPrevYear: true,
    ...overrides,
  })
}

// ── buildSourceContext ───────────────────────────────

describe('buildSourceContext', () => {
  it('converts WidgetContext-like object to SourceContext', () => {
    const stores = new Map<string, Store>([
      ['S001', { id: 'S001', code: 'S001', name: 'Store A' }],
      ['S002', { id: 'S002', code: 'S002', name: 'Store B' }],
    ])
    const result = buildSourceContext({
      duckConn: FAKE_CONN,
      duckDataVersion: 3,
      duckLoadedMonthCount: 6,
      stores,
      prevYearDateRange: {
        from: { year: 2024, month: 1, day: 1 },
        to: { year: 2024, month: 12, day: 31 },
      },
    })

    expect(result.duckConn).toBe(FAKE_CONN)
    expect(result.duckDataVersion).toBe(3)
    expect(result.duckLoadedMonthCount).toBe(6)
    expect(result.storeCount).toBe(2)
    expect(result.hasPrevYear).toBe(true)
  })

  it('sets hasPrevYear to false when prevYearDateRange is undefined', () => {
    const result = buildSourceContext({
      duckConn: null,
      duckDataVersion: 0,
      duckLoadedMonthCount: 0,
      stores: new Map(),
      prevYearDateRange: undefined,
    })

    expect(result.hasPrevYear).toBe(false)
    expect(result.storeCount).toBe(0)
  })

  it('sets storeCount from stores map size', () => {
    const stores = new Map<string, Store>([
      ['S001', { id: 'S001', code: 'S001', name: 'A' }],
      ['S002', { id: 'S002', code: 'S002', name: 'B' }],
      ['S003', { id: 'S003', code: 'S003', name: 'C' }],
    ])
    const result = buildSourceContext({
      duckConn: null,
      duckDataVersion: 0,
      duckLoadedMonthCount: 0,
      stores,
    })
    expect(result.storeCount).toBe(3)
  })
})

// ── resolveTimeSeriesSource ─────────────────────────

describe('resolveTimeSeriesSource', () => {
  it('always returns source=duckdb', () => {
    const result = resolveTimeSeriesSource(makeSourceContext())
    expect(result.source).toBe('duckdb')
  })

  it('marks duckReady=false when duckDataVersion is 0', () => {
    const result = resolveTimeSeriesSource(makeSourceContext({ duckDataVersion: 0 }))
    expect(result.duckReady).toBe(false)
  })

  it('marks duckReady=false when duckConn is null', () => {
    const result = resolveTimeSeriesSource(
      makeSourceContext({ duckConn: null, duckDataVersion: 5 }),
    )
    expect(result.duckReady).toBe(false)
  })

  it('marks duckReady=true when conn exists and version > 0', () => {
    const result = resolveTimeSeriesSource(readyContext())
    expect(result.duckReady).toBe(true)
  })

  it('multiMonthAvailable is true when loadedMonthCount >= 2', () => {
    expect(
      resolveTimeSeriesSource(readyContext({ duckLoadedMonthCount: 2 })).multiMonthAvailable,
    ).toBe(true)
    expect(
      resolveTimeSeriesSource(readyContext({ duckLoadedMonthCount: 1 })).multiMonthAvailable,
    ).toBe(false)
    expect(
      resolveTimeSeriesSource(readyContext({ duckLoadedMonthCount: 0 })).multiMonthAvailable,
    ).toBe(false)
  })

  it('multiStoreAvailable is true when storeCount > 1', () => {
    expect(resolveTimeSeriesSource(readyContext({ storeCount: 3 })).multiStoreAvailable).toBe(true)
    expect(resolveTimeSeriesSource(readyContext({ storeCount: 1 })).multiStoreAvailable).toBe(false)
    expect(resolveTimeSeriesSource(readyContext({ storeCount: 0 })).multiStoreAvailable).toBe(false)
  })
})

// ── resolveYoYSource ────────────────────────────────

describe('resolveYoYSource', () => {
  it('returns source=duckdb when duck is ready', () => {
    const result = resolveYoYSource(readyContext())
    expect(result.source).toBe('duckdb')
    expect(result.duckReady).toBe(true)
  })

  it('falls back to storeResult when duckConn is null', () => {
    const result = resolveYoYSource(makeSourceContext({ duckDataVersion: 1, duckConn: null }))
    expect(result.source).toBe('storeResult')
    expect(result.duckReady).toBe(false)
  })

  it('falls back to storeResult when duckDataVersion is 0', () => {
    const result = resolveYoYSource(makeSourceContext({ duckDataVersion: 0, duckConn: FAKE_CONN }))
    expect(result.source).toBe('storeResult')
    expect(result.duckReady).toBe(false)
  })

  it('propagates multiMonthAvailable and multiStoreAvailable', () => {
    const result = resolveYoYSource(readyContext({ duckLoadedMonthCount: 5, storeCount: 2 }))
    expect(result.multiMonthAvailable).toBe(true)
    expect(result.multiStoreAvailable).toBe(true)
  })

  it('multiMonthAvailable=false when fewer than 2 months loaded', () => {
    const result = resolveYoYSource(readyContext({ duckLoadedMonthCount: 1 }))
    expect(result.multiMonthAvailable).toBe(false)
  })
})

// ── resolveDuckDBOnlySource ─────────────────────────

describe('resolveDuckDBOnlySource', () => {
  it('returns null when duck is not ready (no conn)', () => {
    const result = resolveDuckDBOnlySource(
      makeSourceContext({ duckDataVersion: 1, duckConn: null }),
    )
    expect(result).toBeNull()
  })

  it('returns null when duck is not ready (version=0)', () => {
    const result = resolveDuckDBOnlySource(
      makeSourceContext({ duckDataVersion: 0, duckConn: FAKE_CONN }),
    )
    expect(result).toBeNull()
  })

  it('returns null when both conn and version are missing', () => {
    const result = resolveDuckDBOnlySource(makeSourceContext())
    expect(result).toBeNull()
  })

  it('returns ResolvedSource when duck is ready', () => {
    const result = resolveDuckDBOnlySource(readyContext())
    expect(result).not.toBeNull()
    expect(result!.source).toBe('duckdb')
    expect(result!.duckReady).toBe(true)
  })

  it('sets multiMonthAvailable correctly', () => {
    const ready2 = resolveDuckDBOnlySource(readyContext({ duckLoadedMonthCount: 2 }))
    expect(ready2!.multiMonthAvailable).toBe(true)

    const ready1 = resolveDuckDBOnlySource(readyContext({ duckLoadedMonthCount: 1 }))
    expect(ready1!.multiMonthAvailable).toBe(false)
  })

  it('sets multiStoreAvailable correctly', () => {
    const multi = resolveDuckDBOnlySource(readyContext({ storeCount: 4 }))
    expect(multi!.multiStoreAvailable).toBe(true)

    const single = resolveDuckDBOnlySource(readyContext({ storeCount: 1 }))
    expect(single!.multiStoreAvailable).toBe(false)
  })
})
