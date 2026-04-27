/**
 * MovingAverageHandler contract テスト
 *
 * handler の public contract を固定する。
 * conn をモック、queryStoreDaySummary を stub。
 *
 * @taxonomyKind T:unclassified
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

  it('query 結果の順序が乱れていても anchorSeries は dateKey 昇順になる', async () => {
    // rows を逆順で返す
    const rows = [
      makeSummaryRow(2026, 3, 5, 5000),
      makeSummaryRow(2026, 3, 3, 3000),
      makeSummaryRow(2026, 3, 1, 1000),
      makeSummaryRow(2026, 2, 28, 500),
      makeSummaryRow(2026, 2, 27, 400),
    ]
    mockQuery.mockResolvedValue(rows as never)

    const result = await movingAverageHandler.execute(FAKE_CONN, makeInput())

    // dateKey 昇順を保証
    for (let i = 1; i < result.anchorSeries.length; i++) {
      expect(result.anchorSeries[i].dateKey > result.anchorSeries[i - 1].dateKey).toBe(true)
    }
  })

  it('extraMetrics は input.policy を引き継ぐ（前年 lead-in 欠損で strict が null を返す）', async () => {
    // 前年 MA: anchorRange 2025-03-01..2025-03-05, windowSize 3, policy 'strict'
    // requiredRange は 2025-02-27..2025-03-05 に拡張されるが、
    // DB には 2025-03-01 以降しか is_prev_year=true 行が存在しないと想定。
    // lead-in (2/27, 2/28) が missing のため、先頭 2 日は strict で null になる必要がある。
    // 旧実装 ('partial' 固定) では extraMetrics が強制的に partial になり、
    // 先頭 2 日が少数サンプルで誤った平均値になっていた。
    const prevRows = []
    for (let d = 1; d <= 5; d++) {
      prevRows.push({
        ...makeSummaryRow(2025, 3, d, 1000 + d * 100),
        totalQuantity: 100 + d * 10,
        isPrevYear: true,
      })
    }
    mockQuery.mockResolvedValue(prevRows as never)

    const result = await movingAverageHandler.execute(FAKE_CONN, {
      frame: makeFrame({
        anchorRange: {
          from: { year: 2025, month: 3, day: 1 },
          to: { year: 2025, month: 3, day: 5 },
        },
        metric: 'sales',
        windowSize: 3,
      }),
      policy: 'strict',
      isPrevYear: true,
      extraMetrics: ['quantity'],
    })

    // extraSeries['quantity'] は anchorRange 分（5日）返る
    const qty = result.extraSeries?.['quantity']
    expect(qty).toBeDefined()
    expect(qty).toHaveLength(5)
    // 3/1, 3/2 は lead-in (2/27, 2/28) が missing のため strict で null
    expect(qty![0].value).toBeNull()
    expect(qty![0].status).toBe('missing')
    expect(qty![1].value).toBeNull()
    expect(qty![1].status).toBe('missing')
    // 3/3 以降は 7 日窓に全 ok 行が揃うので ok
    expect(qty![2].status).toBe('ok')
    expect(qty![2].value).toBe((110 + 120 + 130) / 3) // (3/1 + 3/2 + 3/3) / 3
  })

  it('複数店舗の同日 rows が集約されて MA が全店合計ベースになる', async () => {
    // 3店舗 × 3日 (anchorRange: 3/1..3/3, windowSize=1 で MA=当日値)
    const rows = [
      // Store A: 3/1=1000, 3/2=2000, 3/3=3000
      { ...makeSummaryRow(2026, 3, 1, 1000), storeId: 'A' },
      { ...makeSummaryRow(2026, 3, 2, 2000), storeId: 'A' },
      { ...makeSummaryRow(2026, 3, 3, 3000), storeId: 'A' },
      // Store B: 3/1=4000, 3/2=5000, 3/3=6000
      { ...makeSummaryRow(2026, 3, 1, 4000), storeId: 'B' },
      { ...makeSummaryRow(2026, 3, 2, 5000), storeId: 'B' },
      { ...makeSummaryRow(2026, 3, 3, 6000), storeId: 'B' },
    ]
    mockQuery.mockResolvedValue(rows as never)

    const result = await movingAverageHandler.execute(
      FAKE_CONN,
      makeInput({
        anchorRange: {
          from: { year: 2026, month: 3, day: 1 },
          to: { year: 2026, month: 3, day: 3 },
        },
        storeIds: ['A', 'B'],
        windowSize: 1, // MA=当日値なので集約値がそのまま出る
      }),
    )

    // 3/1: A(1000) + B(4000) = 5000
    expect(result.anchorSeries[0].value).toBe(5000)
    // 3/2: A(2000) + B(5000) = 7000
    expect(result.anchorSeries[1].value).toBe(7000)
    // 3/3: A(3000) + B(6000) = 9000
    expect(result.anchorSeries[2].value).toBe(9000)
  })
})
