/**
 * defaults.ts の純粋関数ユニットテスト
 *
 * createDefaultSettings / getDaysInMonth の動作と定数を検証する。
 */
import { describe, it, expect } from 'vitest'
import {
  createDefaultSettings,
  getDaysInMonth,
  COST_RATE_MIN,
  COST_RATE_MAX,
  ALL_STORES_ID,
} from '@/domain/constants/defaults'

describe('getDaysInMonth', () => {
  it('31日月（1月）を返す', () => {
    expect(getDaysInMonth(2026, 1)).toBe(31)
  })

  it('30日月（4月）を返す', () => {
    expect(getDaysInMonth(2026, 4)).toBe(30)
  })

  it('非閏年の2月は28日', () => {
    expect(getDaysInMonth(2026, 2)).toBe(28)
  })

  it('閏年の2月は29日', () => {
    expect(getDaysInMonth(2024, 2)).toBe(29)
  })

  it('100の倍数でも400の倍数でない年は非閏年', () => {
    expect(getDaysInMonth(2100, 2)).toBe(28)
  })

  it('400の倍数は閏年', () => {
    expect(getDaysInMonth(2000, 2)).toBe(29)
  })

  it('12月は31日', () => {
    expect(getDaysInMonth(2026, 12)).toBe(31)
  })
})

describe('createDefaultSettings', () => {
  it('固定デフォルト値が設定される', () => {
    const settings = createDefaultSettings()
    expect(settings.targetGrossProfitRate).toBe(0.25)
    expect(settings.warningThreshold).toBe(0.23)
    expect(settings.flowerCostRate).toBe(0.8)
    expect(settings.directProduceCostRate).toBe(0.85)
    expect(settings.defaultMarkupRate).toBe(0.26)
    expect(settings.defaultBudget).toBe(6_450_000)
    expect(settings.dataEndDay).toBeNull()
    expect(settings.gpDiffBlueThreshold).toBe(0.2)
    expect(settings.gpDiffYellowThreshold).toBe(-0.2)
    expect(settings.gpDiffRedThreshold).toBe(-0.5)
    expect(settings.discountBlueThreshold).toBe(0.02)
    expect(settings.discountYellowThreshold).toBe(0.025)
    expect(settings.discountRedThreshold).toBe(0.03)
    expect(settings.alignmentPolicy).toBe('sameDayOfWeek')
    expect(settings.prevYearSourceYear).toBeNull()
    expect(settings.prevYearSourceMonth).toBeNull()
    expect(settings.prevYearDowOffset).toBeNull()
  })

  it('空のマップが初期化される', () => {
    const settings = createDefaultSettings()
    expect(settings.supplierCategoryMap).toEqual({})
    expect(settings.userCategoryLabels).toEqual({})
    expect(settings.storeLocations).toEqual({})
  })

  it('targetYear/targetMonth が現在日付に基づく', () => {
    const settings = createDefaultSettings()
    const now = new Date()
    expect(settings.targetYear).toBe(now.getFullYear())
    expect(settings.targetMonth).toBe(now.getMonth() + 1)
  })

  it('conditionConfig が有効な構造を持つ', () => {
    const settings = createDefaultSettings()
    expect(settings.conditionConfig).not.toBeNull()
    expect(typeof settings.conditionConfig).toBe('object')
  })
})

describe('constants', () => {
  it('COST_RATE_MIN は 0', () => {
    expect(COST_RATE_MIN).toBe(0)
  })

  it('COST_RATE_MAX は 1.2', () => {
    expect(COST_RATE_MAX).toBe(1.2)
  })

  it('ALL_STORES_ID は "all"', () => {
    expect(ALL_STORES_ID).toBe('all')
  })
})
