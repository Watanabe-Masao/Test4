import { describe, it, expect } from 'vitest'
import {
  loadReducer,
  findSourceMonth,
  monthKey,
  IDLE_STATUS,
  type ComparisonLoadStatus,
  type LoadAction,
} from '../comparisonLoadLogic'
import type { QueryMonth } from '@/domain/models/ComparisonScope'

const months = (specs: ReadonlyArray<[number, number]>): readonly QueryMonth[] =>
  specs.map(([year, month]) => ({ year, month }))

describe('IDLE_STATUS', () => {
  it('is initialized to idle with empty ranges and no error', () => {
    expect(IDLE_STATUS.status).toBe('idle')
    expect(IDLE_STATUS.requestedRanges).toEqual([])
    expect(IDLE_STATUS.loadedRanges).toEqual([])
    expect(IDLE_STATUS.lastError).toBeNull()
  })
})

describe('loadReducer', () => {
  const requested = months([
    [2025, 3],
    [2025, 4],
  ])
  const loaded = months([[2025, 3]])

  it('start action transitions to loading and clears loaded/error', () => {
    const initial: ComparisonLoadStatus = {
      status: 'error',
      requestedRanges: [],
      loadedRanges: months([[2024, 1]]),
      lastError: 'previous',
    }
    const action: LoadAction = { type: 'start', requestedRanges: requested }
    const next = loadReducer(initial, action)
    expect(next.status).toBe('loading')
    expect(next.requestedRanges).toEqual(requested)
    expect(next.loadedRanges).toEqual([])
    expect(next.lastError).toBeNull()
  })

  it('success action stores requested and loaded ranges with no error', () => {
    const next = loadReducer(IDLE_STATUS, {
      type: 'success',
      requestedRanges: requested,
      loadedRanges: requested,
    })
    expect(next.status).toBe('success')
    expect(next.requestedRanges).toEqual(requested)
    expect(next.loadedRanges).toEqual(requested)
    expect(next.lastError).toBeNull()
  })

  it('partial action stores error message and partial loaded set', () => {
    const next = loadReducer(IDLE_STATUS, {
      type: 'partial',
      requestedRanges: requested,
      loadedRanges: loaded,
      error: 'one missing',
    })
    expect(next.status).toBe('partial')
    expect(next.loadedRanges).toEqual(loaded)
    expect(next.lastError).toBe('one missing')
  })

  it('error action records error and preserves loaded ranges', () => {
    const next = loadReducer(IDLE_STATUS, {
      type: 'error',
      requestedRanges: requested,
      loadedRanges: loaded,
      error: 'IO failure',
    })
    expect(next.status).toBe('error')
    expect(next.loadedRanges).toEqual(loaded)
    expect(next.lastError).toBe('IO failure')
  })
})

describe('findSourceMonth', () => {
  it('returns null for empty array', () => {
    expect(findSourceMonth([])).toBeNull()
  })

  it('returns the only element for a single-month array', () => {
    const only: QueryMonth = { year: 2026, month: 3 }
    expect(findSourceMonth([only])).toEqual(only)
  })

  it('returns the middle element for an odd-length array', () => {
    const ranges = months([
      [2025, 12],
      [2026, 1],
      [2026, 2],
    ])
    expect(findSourceMonth(ranges)).toEqual({ year: 2026, month: 1 })
  })

  it('returns the upper-mid element for an even-length array', () => {
    // Math.floor(4 / 2) = 2 → index 2
    const ranges = months([
      [2025, 11],
      [2025, 12],
      [2026, 1],
      [2026, 2],
    ])
    expect(findSourceMonth(ranges)).toEqual({ year: 2026, month: 1 })
  })
})

describe('monthKey', () => {
  it('formats year-month as "YYYY-M"', () => {
    expect(monthKey({ year: 2026, month: 3 })).toBe('2026-3')
  })

  it('does not zero-pad single-digit months', () => {
    expect(monthKey({ year: 2025, month: 1 })).toBe('2025-1')
    expect(monthKey({ year: 2025, month: 12 })).toBe('2025-12')
  })
})
