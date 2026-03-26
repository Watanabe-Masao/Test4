/**
 * MovingAverageHandler contract テスト
 *
 * handler の public contract を固定する。
 * conn をモック、queryStoreDaySummary を stub。
 */
import { describe, it, expect, vi } from 'vitest'
import { movingAverageHandler } from '@/application/queries/temporal/MovingAverageHandler'
import type { MovingAverageInput } from '@/application/queries/temporal/MovingAverageHandler'
import type { RollingAnalysisFrame } from '@/application/usecases/temporal/TemporalFrameTypes'
import { buildTemporalFetchPlan } from '@/application/usecases/temporal/buildTemporalFetchPlan'

// queryStoreDaySummary をモック
vi.mock('@/infrastructure/duckdb/queries/storeDaySummary', () => ({
  queryStoreDaySummary: vi.fn(),
}))

import { queryStoreDaySummary } from '@/infrastructure/duckdb/queries/storeDaySummary'

const mockQuery = vi.mocked(queryStoreDaySummary)

function makeFrame(overrides: Partial<RollingAnalysisFrame> = {}): RollingAnalysisFrame {
  return {
    kind: 'analysis-frame',
    anchorRange: {
      from: { year: 2026, month: 3, day: 1 },
      to: { year: 2026, month: 3, day: 5 },
    },
    storeIds: ['S001'],
    metric: 'sales',
    granularity: 'day',
    analysisMode: 'movingAverage',
    windowSize: 3,
    direction: 'trailing',
    ...overrides,
  }
}

function makeInput(frameOverrides: Partial<RollingAnalysisFrame> = {}): MovingAverageInput {
  return { frame: makeFrame(frameOverrides), policy: 'strict' }
}

function makeSummaryRow(year: number, month: number, day: number, sales: number) {
  const m = String(month).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return {
    dateKey: `${year}-${m}-${d}`,
    year,
    month,
    day,
    storeId: 'S001',
    sales,
    coreSales: sales * 0.7,
    grossSales: sales,
    customers: 10,
    discount71: 0,
    discount72: 0,
    discount73: 0,
    discount74: 0,
    discountAmount: 0,
    discountAbsolute: 0,
    purchaseCost: 0,
    interStoreInCost: 0,
    interStoreOutCost: 0,
    interDeptInCost: 0,
    interDeptOutCost: 0,
    flowersCost: 0,
    flowersPrice: 0,
    directProduceCost: 0,
    directProducePrice: 0,
    consumablesCost: 0,
    totalQuantity: 0,
    isPrevYear: false,
  }
}

const FAKE_CONN = {} as never

describe('MovingAverageHandler contract', () => {
  it('query 結果が空でも anchorSeries は anchorRange 日数分返る（全 missing）', async () => {
    mockQuery.mockResolvedValue([])

    const result = await movingAverageHandler.execute(FAKE_CONN, makeInput())

    // anchorRange: 3/1..3/5 = 5日
    expect(result.anchorSeries).toHaveLength(5)
    expect(result.anchorSeries.every((p) => p.status === 'missing')).toBe(true)
    expect(result.anchorSeries.every((p) => p.value === null)).toBe(true)
  })

  it('anchorSeries の先頭/末尾 dateKey が anchorRange と一致する', async () => {
    const rows = []
    for (let d = 27; d <= 28; d++) rows.push(makeSummaryRow(2026, 2, d, 1000))
    for (let d = 1; d <= 5; d++) rows.push(makeSummaryRow(2026, 3, d, 2000))
    mockQuery.mockResolvedValue(rows as never)

    const result = await movingAverageHandler.execute(FAKE_CONN, makeInput())

    expect(result.anchorSeries[0].dateKey).toBe('2026-03-01')
    expect(result.anchorSeries[result.anchorSeries.length - 1].dateKey).toBe('2026-03-05')
  })

  it('requiredMonths は fetch plan 結果と一致する', async () => {
    mockQuery.mockResolvedValue([])

    const frame = makeFrame()
    const plan = buildTemporalFetchPlan(frame)
    const result = await movingAverageHandler.execute(FAKE_CONN, makeInput())

    expect(result.requiredMonths).toEqual(plan.requiredMonths)
  })

  it('storeIds が query パラメータにそのまま渡る', async () => {
    mockQuery.mockResolvedValue([])

    await movingAverageHandler.execute(FAKE_CONN, makeInput({ storeIds: ['A', 'B', 'C'] }))

    expect(mockQuery).toHaveBeenCalledWith(
      FAKE_CONN,
      expect.objectContaining({ storeIds: ['A', 'B', 'C'] }),
    )
  })

  it('requiredRange 外の rows が anchorSeries に漏れない', async () => {
    // anchorRange: 3/1..3/5, windowSize=3 → requiredRange: 2/27..3/5
    const rows = [
      makeSummaryRow(2026, 2, 25, 9999), // requiredRange 外
      makeSummaryRow(2026, 2, 27, 1000),
      makeSummaryRow(2026, 3, 1, 2000),
      makeSummaryRow(2026, 3, 5, 3000),
      makeSummaryRow(2026, 3, 10, 9999), // requiredRange 外
    ]
    mockQuery.mockResolvedValue(rows as never)

    const result = await movingAverageHandler.execute(FAKE_CONN, makeInput())

    // anchorSeries は 3/1..3/5 のみ
    expect(result.anchorSeries).toHaveLength(5)
    const dateKeys = result.anchorSeries.map((p) => p.dateKey)
    expect(dateKeys).not.toContain('2026-02-25')
    expect(dateKeys).not.toContain('2026-03-10')
  })
})
