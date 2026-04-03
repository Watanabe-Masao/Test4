/**
 * createPairedHandler — 単体テスト
 *
 * @invariant INV-RUN-02 Comparison Integrity
 */
import { describe, it, expect, vi } from 'vitest'
import { createPairedHandler } from './createPairedHandler'
import type { QueryHandler, BaseQueryInput } from './QueryContract'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

// ── テスト用 mock handler ──

interface TestInput extends BaseQueryInput {
  readonly isPrevYear?: boolean
}

interface TestOutput {
  readonly records: readonly string[]
  readonly isPrevYear: boolean
}

const mockHandler: QueryHandler<TestInput, TestOutput> = {
  name: 'TestHandler',
  execute: vi.fn(async (_conn: AsyncDuckDBConnection, input: TestInput) => ({
    records: [`${input.dateFrom}-${input.dateTo}`],
    isPrevYear: input.isPrevYear ?? false,
  })),
}

const mockConn = {} as AsyncDuckDBConnection

describe('createPairedHandler', () => {
  it('creates a handler with Pair suffix name', () => {
    const paired = createPairedHandler(mockHandler)
    expect(paired.name).toBe('TestHandlerPair')
  })

  it('allows custom name', () => {
    const paired = createPairedHandler(mockHandler, { name: 'CustomPair' })
    expect(paired.name).toBe('CustomPair')
  })

  it('executes current only when no comparison dates', async () => {
    const paired = createPairedHandler(mockHandler)
    const result = await paired.execute(mockConn, {
      dateFrom: '2025-03-01',
      dateTo: '2025-03-31',
    })

    expect(result.current).toEqual({
      records: ['2025-03-01-2025-03-31'],
      isPrevYear: false,
    })
    expect(result.comparison).toBeNull()
  })

  it('executes both current and comparison when dates provided', async () => {
    const paired = createPairedHandler(mockHandler)
    const result = await paired.execute(mockConn, {
      dateFrom: '2025-03-01',
      dateTo: '2025-03-31',
      comparisonDateFrom: '2024-03-01',
      comparisonDateTo: '2024-03-31',
    })

    expect(result.current).toEqual({
      records: ['2025-03-01-2025-03-31'],
      isPrevYear: false,
    })
    expect(result.comparison).toEqual({
      records: ['2024-03-01-2024-03-31'],
      isPrevYear: true,
    })
  })

  it('sets isPrevYear=false for current and isPrevYear=true for comparison', async () => {
    const spy = vi.fn(async (_conn: AsyncDuckDBConnection, input: TestInput) => ({
      records: [] as string[],
      isPrevYear: input.isPrevYear ?? false,
    }))
    const handler: QueryHandler<TestInput, TestOutput> = { name: 'Spy', execute: spy }
    const paired = createPairedHandler(handler)

    await paired.execute(mockConn, {
      dateFrom: '2025-03-01',
      dateTo: '2025-03-31',
      comparisonDateFrom: '2024-03-01',
      comparisonDateTo: '2024-03-31',
    })

    expect(spy).toHaveBeenCalledTimes(2)
    const [, currentInput] = spy.mock.calls[0]
    const [, comparisonInput] = spy.mock.calls[1]
    expect(currentInput.isPrevYear).toBe(false)
    expect(comparisonInput.isPrevYear).toBe(true)
  })

  it('passes storeIds through to both calls', async () => {
    const spy = vi.fn(async (_conn: AsyncDuckDBConnection, input: TestInput) => ({
      records: [] as string[],
      isPrevYear: input.isPrevYear ?? false,
    }))
    const handler: QueryHandler<TestInput, TestOutput> = { name: 'Spy', execute: spy }
    const paired = createPairedHandler(handler)

    await paired.execute(mockConn, {
      dateFrom: '2025-03-01',
      dateTo: '2025-03-31',
      storeIds: ['S1', 'S2'],
      comparisonDateFrom: '2024-03-01',
      comparisonDateTo: '2024-03-31',
    })

    const [, currentInput] = spy.mock.calls[0]
    const [, comparisonInput] = spy.mock.calls[1]
    expect(currentInput.storeIds).toEqual(['S1', 'S2'])
    expect(comparisonInput.storeIds).toEqual(['S1', 'S2'])
  })

  it('runs current and comparison in parallel (Promise.all)', async () => {
    let resolveFirst: () => void
    let resolveSecond: () => void
    const firstPromise = new Promise<void>((r) => {
      resolveFirst = r
    })
    const secondPromise = new Promise<void>((r) => {
      resolveSecond = r
    })

    let callCount = 0
    const slowHandler: QueryHandler<TestInput, TestOutput> = {
      name: 'Slow',
      execute: async (_conn, input) => {
        callCount++
        if (callCount === 1) await firstPromise
        else await secondPromise
        return { records: [], isPrevYear: input.isPrevYear ?? false }
      },
    }

    const paired = createPairedHandler(slowHandler)
    const promise = paired.execute(mockConn, {
      dateFrom: '2025-03-01',
      dateTo: '2025-03-31',
      comparisonDateFrom: '2024-03-01',
      comparisonDateTo: '2024-03-31',
    })

    // Both should be started (callCount should be 2 after microtask flush)
    await new Promise((r) => setTimeout(r, 0))
    expect(callCount).toBe(2)

    resolveFirst!()
    resolveSecond!()
    const result = await promise
    expect(result.current).toBeDefined()
    expect(result.comparison).toBeDefined()
  })
})
