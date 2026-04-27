/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import {
  computeDailyAchievementRate,
  computeBudgetPace,
  computeYoYGrowthRate,
} from '../salesMetrics'

describe('salesMetrics', () => {
  describe('computeDailyAchievementRate', () => {
    it('正常: actual/budget', () => {
      expect(computeDailyAchievementRate(80000, 100000)).toBeCloseTo(0.8)
    })
    it('budget=0 → 0', () => {
      expect(computeDailyAchievementRate(80000, 0)).toBe(0)
    })
  })

  describe('computeBudgetPace', () => {
    it('ペース 1.0: 50%消化で50%経過', () => {
      expect(computeBudgetPace(3000000, 6000000, 15, 30)).toBeCloseTo(1.0)
    })
    it('ペース > 1: 前倒し', () => {
      expect(computeBudgetPace(4000000, 6000000, 15, 30)).toBeGreaterThan(1.0)
    })
    it('budget=0 → 0', () => {
      expect(computeBudgetPace(3000000, 0, 15, 30)).toBe(0)
    })
  })

  describe('computeYoYGrowthRate', () => {
    it('成長: +20%', () => {
      expect(computeYoYGrowthRate(120000, 100000)).toBeCloseTo(0.2)
    })
    it('減少: -10%', () => {
      expect(computeYoYGrowthRate(90000, 100000)).toBeCloseTo(-0.1)
    })
    it('前年 0 → null', () => {
      expect(computeYoYGrowthRate(100000, 0)).toBeNull()
    })
  })
})
