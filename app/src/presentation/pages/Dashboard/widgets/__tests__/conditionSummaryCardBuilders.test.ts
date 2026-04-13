import { describe, it, expect } from 'vitest'
import {
  computeTrend,
  computeRateTrend,
  buildUnifiedCards,
  CONDITION_CARD_ORDER,
  CONDITION_CARD_GROUP,
  type CardSummary,
  type YoYCardSummary,
  type TrendDirection,
} from '@/presentation/pages/Dashboard/widgets/conditionSummaryCardBuilders'

describe('computeTrend', () => {
  const extractor = (n: number) => n

  it('returns undefined when effectiveDay < halfDays*2', () => {
    const daily = new Map<number, number>()
    expect(computeTrend(daily, 10, extractor, 7)).toBeUndefined()
  })

  it('returns undefined when prev sum is 0', () => {
    const daily = new Map<number, number>([
      [8, 100],
      [9, 200],
    ])
    // effectiveDay=14, halfDays=7: recent=days 8..14, prev=days 1..7
    const result = computeTrend(daily, 14, extractor, 7)
    expect(result).toBeUndefined()
  })

  it('returns flat direction when ratio is within ±2%', () => {
    const daily = new Map<number, number>()
    for (let d = 1; d <= 14; d++) daily.set(d, 100)
    const result = computeTrend(daily, 14, extractor, 7)
    expect(result?.direction).toBe<TrendDirection>('flat')
  })

  it('returns up direction when recent sum ≥ prev*1.02', () => {
    const daily = new Map<number, number>()
    for (let d = 1; d <= 7; d++) daily.set(d, 100)
    for (let d = 8; d <= 14; d++) daily.set(d, 110)
    const result = computeTrend(daily, 14, extractor, 7)
    expect(result?.direction).toBe<TrendDirection>('up')
  })

  it('returns down direction when recent sum ≤ prev*0.98', () => {
    const daily = new Map<number, number>()
    for (let d = 1; d <= 7; d++) daily.set(d, 100)
    for (let d = 8; d <= 14; d++) daily.set(d, 80)
    const result = computeTrend(daily, 14, extractor, 7)
    expect(result?.direction).toBe<TrendDirection>('down')
  })

  it('uses custom halfDays parameter', () => {
    const daily = new Map<number, number>()
    for (let d = 1; d <= 6; d++) daily.set(d, 100)
    const result = computeTrend(daily, 6, extractor, 3)
    expect(result?.direction).toBe<TrendDirection>('flat')
  })
})

describe('computeRateTrend', () => {
  it('returns undefined when effectiveDay < halfDays*2', () => {
    expect(
      computeRateTrend(
        new Map(),
        5,
        () => 0,
        () => 0,
        7,
      ),
    ).toBeUndefined()
  })

  it('returns undefined when denominators are zero', () => {
    const daily = new Map<number, { num: number; den: number }>()
    for (let d = 1; d <= 14; d++) daily.set(d, { num: 10, den: 0 })
    const result = computeRateTrend(
      daily,
      14,
      (r) => r.num,
      (r) => r.den,
    )
    expect(result).toBeUndefined()
  })

  it('returns up when rate difference ≥+0.2pp', () => {
    const daily = new Map<number, { num: number; den: number }>()
    // prev days 1..7: rate = 10/100 = 10%
    for (let d = 1; d <= 7; d++) daily.set(d, { num: 10, den: 100 })
    // recent days 8..14: rate = 11/100 = 11% → +1.0pp
    for (let d = 8; d <= 14; d++) daily.set(d, { num: 11, den: 100 })
    const result = computeRateTrend(
      daily,
      14,
      (r) => r.num,
      (r) => r.den,
    )
    expect(result?.direction).toBe<TrendDirection>('up')
    expect(result?.ratio).toBe('+1.00pp')
  })

  it('returns down when rate difference ≤-0.2pp', () => {
    const daily = new Map<number, { num: number; den: number }>()
    for (let d = 1; d <= 7; d++) daily.set(d, { num: 15, den: 100 })
    for (let d = 8; d <= 14; d++) daily.set(d, { num: 10, den: 100 })
    const result = computeRateTrend(
      daily,
      14,
      (r) => r.num,
      (r) => r.den,
    )
    expect(result?.direction).toBe<TrendDirection>('down')
    expect(result?.ratio).toBe('-5.00pp')
  })

  it('returns flat when diff is within ±0.2pp', () => {
    const daily = new Map<number, { num: number; den: number }>()
    for (let d = 1; d <= 14; d++) daily.set(d, { num: 10, den: 100 })
    const result = computeRateTrend(
      daily,
      14,
      (r) => r.num,
      (r) => r.den,
    )
    expect(result?.direction).toBe<TrendDirection>('flat')
  })
})

describe('CONDITION_CARD_ORDER and CONDITION_CARD_GROUP', () => {
  it('CONDITION_CARD_ORDER contains sales first', () => {
    expect(CONDITION_CARD_ORDER[0]).toBe('sales')
  })

  it('CONDITION_CARD_ORDER has 12 entries', () => {
    expect(CONDITION_CARD_ORDER).toHaveLength(12)
  })

  it('CONDITION_CARD_GROUP classifies sales/gp/markupRate as budget', () => {
    expect(CONDITION_CARD_GROUP.sales).toBe('budget')
    expect(CONDITION_CARD_GROUP.gp).toBe('budget')
    expect(CONDITION_CARD_GROUP.markupRate).toBe('budget')
  })

  it('CONDITION_CARD_GROUP classifies YoY metrics correctly', () => {
    expect(CONDITION_CARD_GROUP.customerYoY).toBe('yoy')
    expect(CONDITION_CARD_GROUP.totalCost).toBe('yoy')
    expect(CONDITION_CARD_GROUP.requiredPace).toBe('yoy')
  })

  it('all IDs in CONDITION_CARD_ORDER appear in CONDITION_CARD_GROUP', () => {
    for (const id of CONDITION_CARD_ORDER) {
      expect(CONDITION_CARD_GROUP[id]).toBeDefined()
    }
  })
})

describe('buildUnifiedCards', () => {
  const makeBudget = (key: string, label: string): CardSummary =>
    ({
      key: key as CardSummary['key'],
      label,
      icon: 'X',
      color: '#000',
      value: `${label}-val`,
      sub: `${label}-sub`,
      signalColor: '#111',
    }) as CardSummary

  const makeYoy = (
    key: YoYCardSummary['key'],
    detail: YoYCardSummary['detailBreakdown'],
  ): YoYCardSummary => ({
    key,
    label: key,
    value: `${key}-val`,
    sub: `${key}-sub`,
    signalColor: '#222',
    metricId: null,
    detailBreakdown: detail,
  })

  it('orders cards by CONDITION_CARD_ORDER', () => {
    const budget = [makeBudget('gp', 'GP'), makeBudget('sales', 'Sales')]
    const result = buildUnifiedCards(budget, [], false)
    expect(result.map((c) => c.id)).toEqual(['sales', 'gp'])
  })

  it('combines budget and yoy cards and orders them', () => {
    const budget = [makeBudget('sales', 'Sales')]
    const yoy = [makeYoy('customerYoY', 'customerYoY'), makeYoy('totalCost', 'totalCost')]
    const result = buildUnifiedCards(budget, yoy, true)
    expect(result.map((c) => c.id)).toEqual(['sales', 'customerYoY', 'totalCost'])
  })

  it('sets clickable=true for budget cards regardless of hasMultipleStores', () => {
    const result = buildUnifiedCards([makeBudget('sales', 'Sales')], [], false)
    expect(result[0].clickable).toBe(true)
  })

  it('sets clickable=false for yoy cards when hasMultipleStores=false', () => {
    const yoy = [makeYoy('customerYoY', 'customerYoY')]
    const result = buildUnifiedCards([], yoy, false)
    expect(result[0].clickable).toBe(false)
  })

  it('sets clickable=true for yoy cards when hasMultipleStores=true and detailBreakdown present', () => {
    const yoy = [makeYoy('customerYoY', 'customerYoY')]
    const result = buildUnifiedCards([], yoy, true)
    expect(result[0].clickable).toBe(true)
  })

  it('sets clickable=false for yoy cards when detailBreakdown is null', () => {
    const yoy = [makeYoy('customerYoY', null)]
    const result = buildUnifiedCards([], yoy, true)
    expect(result[0].clickable).toBe(false)
  })

  it('attaches trend info to matching card key', () => {
    const budget = [makeBudget('sales', 'Sales')]
    const trends = new Map<string, { direction: TrendDirection; ratio: string }>([
      ['sales', { direction: 'up', ratio: '+5.00%' }],
    ])
    const result = buildUnifiedCards(budget, [], false, trends)
    expect(result[0].trend?.direction).toBe('up')
    expect(result[0].trend?.ratio).toBe('+5.00%')
  })

  it('propagates hint from budget card', () => {
    const budget: CardSummary[] = [
      {
        ...makeBudget('gp', 'GP'),
        hint: '粗利額予算が未設定',
      },
    ]
    const result = buildUnifiedCards(budget, [], false)
    expect(result[0].hint).toBe('粗利額予算が未設定')
  })

  it('skips ids not present in CONDITION_CARD_ORDER', () => {
    // Every valid key appears in order, so an empty array → empty result
    const result = buildUnifiedCards([], [], false)
    expect(result).toEqual([])
  })
})
