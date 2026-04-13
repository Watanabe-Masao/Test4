/**
 * FactorDecompositionTypes — Zod 契約の純粋テスト
 */
import { describe, it, expect } from 'vitest'
import {
  DecomposeLevel,
  TwoFactorResultSchema,
  ThreeFactorResultSchema,
  FiveFactorResultSchema,
  FactorDecompositionReadModel,
} from './FactorDecompositionTypes'

describe('DecomposeLevel', () => {
  it('accepts "two"', () => {
    expect(DecomposeLevel.parse('two')).toBe('two')
  })

  it('accepts "three"', () => {
    expect(DecomposeLevel.parse('three')).toBe('three')
  })

  it('accepts "five"', () => {
    expect(DecomposeLevel.parse('five')).toBe('five')
  })

  it('rejects unknown level', () => {
    expect(() => DecomposeLevel.parse('four')).toThrow()
  })

  it('rejects numeric input', () => {
    expect(() => DecomposeLevel.parse(2)).toThrow()
  })
})

describe('TwoFactorResultSchema', () => {
  it('parses valid 2-factor result', () => {
    const parsed = TwoFactorResultSchema.parse({ custEffect: 100, ticketEffect: -50 })
    expect(parsed.custEffect).toBe(100)
    expect(parsed.ticketEffect).toBe(-50)
  })

  it('rejects missing ticketEffect', () => {
    expect(() => TwoFactorResultSchema.parse({ custEffect: 100 })).toThrow()
  })

  it('rejects non-number custEffect', () => {
    expect(() => TwoFactorResultSchema.parse({ custEffect: '100', ticketEffect: 0 })).toThrow()
  })
})

describe('ThreeFactorResultSchema', () => {
  it('parses valid 3-factor result', () => {
    const parsed = ThreeFactorResultSchema.parse({
      custEffect: 10,
      qtyEffect: 20,
      pricePerItemEffect: 30,
    })
    expect(parsed.qtyEffect).toBe(20)
  })

  it('rejects missing pricePerItemEffect', () => {
    expect(() => ThreeFactorResultSchema.parse({ custEffect: 10, qtyEffect: 20 })).toThrow()
  })

  it('accepts zero values', () => {
    const parsed = ThreeFactorResultSchema.parse({
      custEffect: 0,
      qtyEffect: 0,
      pricePerItemEffect: 0,
    })
    expect(parsed.custEffect).toBe(0)
  })
})

describe('FiveFactorResultSchema', () => {
  it('parses valid 5-factor result', () => {
    const parsed = FiveFactorResultSchema.parse({
      custEffect: 1,
      qtyEffect: 2,
      priceEffect: 3,
      mixEffect: 4,
    })
    expect(parsed.mixEffect).toBe(4)
  })

  it('rejects missing mixEffect', () => {
    expect(() =>
      FiveFactorResultSchema.parse({
        custEffect: 1,
        qtyEffect: 2,
        priceEffect: 3,
      }),
    ).toThrow()
  })
})

describe('FactorDecompositionReadModel', () => {
  const makeModel = () => ({
    level: 'two' as const,
    prevSales: 1000,
    curSales: 1200,
    salesDelta: 200,
    effects: { custEffect: 150, ticketEffect: 50 },
    effectsSum: 200,
    invariantSatisfied: true,
    meta: {
      usedFallback: false,
      authoritative: true,
      tolerance: 1e-6,
    },
  })

  it('parses valid read model', () => {
    const parsed = FactorDecompositionReadModel.parse(makeModel())
    expect(parsed.level).toBe('two')
    expect(parsed.salesDelta).toBe(200)
    expect(parsed.effects.custEffect).toBe(150)
  })

  it('accepts level three', () => {
    const parsed = FactorDecompositionReadModel.parse({ ...makeModel(), level: 'three' })
    expect(parsed.level).toBe('three')
  })

  it('accepts level five', () => {
    const parsed = FactorDecompositionReadModel.parse({ ...makeModel(), level: 'five' })
    expect(parsed.level).toBe('five')
  })

  it('rejects unknown level enum', () => {
    expect(() => FactorDecompositionReadModel.parse({ ...makeModel(), level: 'four' })).toThrow()
  })

  it('rejects non-number prevSales', () => {
    const bad = makeModel()
    ;(bad as unknown as { prevSales: unknown }).prevSales = '1000'
    expect(() => FactorDecompositionReadModel.parse(bad)).toThrow()
  })

  it('rejects missing invariantSatisfied', () => {
    const bad = makeModel()
    delete (bad as Partial<typeof bad>).invariantSatisfied
    expect(() => FactorDecompositionReadModel.parse(bad)).toThrow()
  })

  it('rejects missing meta.tolerance', () => {
    const bad = makeModel()
    delete (bad.meta as Partial<typeof bad.meta>).tolerance
    expect(() => FactorDecompositionReadModel.parse(bad)).toThrow()
  })

  it('accepts empty effects record', () => {
    const parsed = FactorDecompositionReadModel.parse({ ...makeModel(), effects: {} })
    expect(Object.keys(parsed.effects)).toHaveLength(0)
  })
})
