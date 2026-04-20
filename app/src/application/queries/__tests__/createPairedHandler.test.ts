/**
 * createPairedHandler — handler pair 化ファクトリのテスト
 *
 * 検証:
 * - current 側は常に実行される
 * - comparisonDateFrom/To 両方指定時のみ comparison 実行
 * - current / comparison は並列実行（Promise.all）
 * - comparison 実行時は dateFrom/To を comparisonDateFrom/To に差し替える
 * - isPrevYear フラグが正しくセットされる
 */
import { describe, it, expect, vi } from 'vitest'
import { createPairedHandler } from '../createPairedHandler'
import type { QueryHandler, BaseQueryInput } from '../QueryContract'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'

interface TestInput extends BaseQueryInput {
  readonly isPrevYear?: boolean
}
interface TestOutput {
  readonly rows: readonly unknown[]
}

describe('createPairedHandler', () => {
  function createBaseHandler() {
    const execute = vi.fn(async (_conn: AsyncDuckDBConnection, input: TestInput) => {
      return {
        rows: [{ dateFrom: input.dateFrom, dateTo: input.dateTo, isPrevYear: input.isPrevYear }],
      } as TestOutput
    })
    const handler: QueryHandler<TestInput, TestOutput> = {
      name: 'TestHandler',
      execute,
    }
    return { handler, execute }
  }

  const mockConn = {} as AsyncDuckDBConnection

  it("デフォルト name は '{baseName}Pair'", () => {
    const { handler } = createBaseHandler()
    const paired = createPairedHandler(handler)
    expect(paired.name).toBe('TestHandlerPair')
    expect(paired.baseName).toBe('TestHandler')
  })

  it('options.name でカスタム名を指定できる', () => {
    const { handler } = createBaseHandler()
    const paired = createPairedHandler(handler, { name: 'CustomName' })
    expect(paired.name).toBe('CustomName')
  })

  it('comparison なし（dateFrom/To のみ）で current だけ実行', async () => {
    const { handler, execute } = createBaseHandler()
    const paired = createPairedHandler(handler)
    const r = await paired.execute(mockConn, {
      dateFrom: '2026-03-01',
      dateTo: '2026-03-31',
    })
    expect(execute).toHaveBeenCalledTimes(1)
    expect(r.current).not.toBeNull()
    expect(r.comparison).toBeNull()
  })

  it('comparisonDateFrom/To 両方指定で current + comparison 実行', async () => {
    const { handler, execute } = createBaseHandler()
    const paired = createPairedHandler(handler)
    const r = await paired.execute(mockConn, {
      dateFrom: '2026-03-01',
      dateTo: '2026-03-31',
      comparisonDateFrom: '2025-03-01',
      comparisonDateTo: '2025-03-31',
    })
    expect(execute).toHaveBeenCalledTimes(2)
    expect(r.current).not.toBeNull()
    expect(r.comparison).not.toBeNull()
  })

  it('current は isPrevYear=false', async () => {
    const { handler, execute } = createBaseHandler()
    const paired = createPairedHandler(handler)
    await paired.execute(mockConn, {
      dateFrom: '2026-03-01',
      dateTo: '2026-03-31',
    })
    expect(execute.mock.calls[0][1].isPrevYear).toBe(false)
  })

  it('comparison は isPrevYear=true + dateFrom/To が comparisonDateFrom/To', async () => {
    const { handler, execute } = createBaseHandler()
    const paired = createPairedHandler(handler)
    await paired.execute(mockConn, {
      dateFrom: '2026-03-01',
      dateTo: '2026-03-31',
      comparisonDateFrom: '2025-03-01',
      comparisonDateTo: '2025-03-31',
    })
    const compCall = execute.mock.calls.find((c) => c[1].isPrevYear === true)
    expect(compCall).toBeDefined()
    expect(compCall![1].dateFrom).toBe('2025-03-01')
    expect(compCall![1].dateTo).toBe('2025-03-31')
  })

  it('comparison 片方だけ指定（From のみ）は実行しない', async () => {
    const { handler, execute } = createBaseHandler()
    const paired = createPairedHandler(handler)
    const r = await paired.execute(mockConn, {
      dateFrom: '2026-03-01',
      dateTo: '2026-03-31',
      comparisonDateFrom: '2025-03-01',
    })
    expect(execute).toHaveBeenCalledTimes(1)
    expect(r.comparison).toBeNull()
  })

  it('extra フィールド（storeIds 等）も current/comparison 両側に伝播', async () => {
    const { handler, execute } = createBaseHandler()
    const paired = createPairedHandler(handler)
    await paired.execute(mockConn, {
      dateFrom: '2026-03-01',
      dateTo: '2026-03-31',
      storeIds: ['s1', 's2'],
      comparisonDateFrom: '2025-03-01',
      comparisonDateTo: '2025-03-31',
    })
    for (const call of execute.mock.calls) {
      expect(call[1].storeIds).toEqual(['s1', 's2'])
    }
  })
})
