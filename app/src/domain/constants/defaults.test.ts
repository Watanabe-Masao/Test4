import { describe, it, expect } from 'vitest'
import { createDefaultSettings, getDaysInMonth, COST_RATE_MIN, COST_RATE_MAX } from './defaults'

describe('createDefaultSettings', () => {
  it('現在の年月をデフォルトにする', () => {
    const settings = createDefaultSettings()
    const now = new Date()

    expect(settings.targetYear).toBe(now.getFullYear())
    expect(settings.targetMonth).toBe(now.getMonth() + 1)
  })

  it('デフォルト粗利率が0.25', () => {
    const settings = createDefaultSettings()
    expect(settings.targetGrossProfitRate).toBe(0.25)
  })

  it('デフォルト警告しきい値が0.23', () => {
    const settings = createDefaultSettings()
    expect(settings.warningThreshold).toBe(0.23)
  })

  it('花掛け率が0.80', () => {
    const settings = createDefaultSettings()
    expect(settings.flowerCostRate).toBe(0.80)
  })

  it('産直掛け率が0.85', () => {
    const settings = createDefaultSettings()
    expect(settings.directProduceCostRate).toBe(0.85)
  })

  it('デフォルト値入率が0.26', () => {
    const settings = createDefaultSettings()
    expect(settings.defaultMarkupRate).toBe(0.26)
  })

  it('デフォルト予算が6,450,000', () => {
    const settings = createDefaultSettings()
    expect(settings.defaultBudget).toBe(6_450_000)
  })

  it('取引先カテゴリマップは空', () => {
    const settings = createDefaultSettings()
    expect(Object.keys(settings.supplierCategoryMap)).toHaveLength(0)
  })

  it('readonly プロパティが返される', () => {
    const settings = createDefaultSettings()
    expect(typeof settings.targetYear).toBe('number')
  })
})

describe('getDaysInMonth', () => {
  it('2月（平年）は28日', () => {
    expect(getDaysInMonth(2025, 2)).toBe(28)
  })

  it('2月（閏年）は29日', () => {
    expect(getDaysInMonth(2024, 2)).toBe(29)
  })

  it('1月は31日', () => {
    expect(getDaysInMonth(2026, 1)).toBe(31)
  })

  it('4月は30日', () => {
    expect(getDaysInMonth(2026, 4)).toBe(30)
  })

  it('12月は31日', () => {
    expect(getDaysInMonth(2026, 12)).toBe(31)
  })

  it('全月で正しい日数を返す', () => {
    const expected2026 = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    for (let m = 1; m <= 12; m++) {
      expect(getDaysInMonth(2026, m)).toBe(expected2026[m - 1])
    }
  })
})

describe('COST_RATE constants', () => {
  it('掛け率の範囲が正しい', () => {
    expect(COST_RATE_MIN).toBe(0)
    expect(COST_RATE_MAX).toBe(1.2)
    expect(COST_RATE_MAX).toBeGreaterThan(COST_RATE_MIN)
  })
})
