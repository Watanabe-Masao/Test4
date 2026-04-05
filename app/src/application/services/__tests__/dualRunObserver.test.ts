import { describe, it, expect, beforeEach } from 'vitest'
import {
  recordCall,
  recordMismatch,
  recordNullMismatch,
  dualRunStatsHandler,
} from '../dualRunObserver'

describe('dualRunObserver', () => {
  beforeEach(() => {
    dualRunStatsHandler('reset')
  })

  describe('recordCall', () => {
    it('呼出回数を関数ごとにカウントする', () => {
      recordCall('findCoreTime')
      recordCall('findCoreTime')
      recordCall('findTurnaroundHour')

      const summary = dualRunStatsHandler() as {
        totalCalls: number
        byFunction: Record<string, { calls: number }>
      }
      expect(summary.totalCalls).toBe(3)
      expect(summary.byFunction.findCoreTime.calls).toBe(2)
      expect(summary.byFunction.findTurnaroundHour.calls).toBe(1)
    })
  })

  describe('recordMismatch', () => {
    it('mismatch 統計を蓄積する', () => {
      recordCall('findCoreTime')
      recordMismatch('findCoreTime', 1e-12, 'ok', 'ok', { hourCount: 10 })

      const summary = dualRunStatsHandler() as {
        totalMismatches: number
        globalMaxAbsDiff: number
        verdict: string
        byFunction: Record<string, { mismatches: number; maxAbsDiff: number }>
      }
      expect(summary.totalMismatches).toBe(1)
      expect(summary.globalMaxAbsDiff).toBe(1e-12)
      expect(summary.byFunction.findCoreTime.mismatches).toBe(1)
    })

    it('maxAbsDiff の最大値を追跡する', () => {
      recordMismatch('findCoreTime', 1e-12, 'ok', 'ok', { hourCount: 10 })
      recordMismatch('findCoreTime', 5e-8, 'ok', 'ok', { hourCount: 10 })
      recordMismatch('findCoreTime', 2e-10, 'ok', 'ok', { hourCount: 10 })

      const summary = dualRunStatsHandler() as {
        globalMaxAbsDiff: number
        byFunction: Record<string, { maxAbsDiff: number }>
      }
      expect(summary.globalMaxAbsDiff).toBe(5e-8)
      expect(summary.byFunction.findCoreTime.maxAbsDiff).toBe(5e-8)
    })

    it('invariant violation をカウントする', () => {
      recordMismatch('findTurnaroundHour', 0.5, 'ok', 'violated', { hourCount: 10 })

      const summary = dualRunStatsHandler() as {
        totalInvariantViolations: number
        verdict: string
      }
      expect(summary.totalInvariantViolations).toBe(1)
      expect(summary.verdict).toBe('needs-investigation')
    })
  })

  describe('recordNullMismatch', () => {
    it('null mismatch を記録する', () => {
      recordNullMismatch('findCoreTime')

      const summary = dualRunStatsHandler() as {
        totalNullMismatches: number
        totalMismatches: number
        verdict: string
      }
      expect(summary.totalNullMismatches).toBe(1)
      expect(summary.totalMismatches).toBe(1)
      expect(summary.verdict).toBe('needs-investigation')
    })
  })

  describe('verdict', () => {
    it('mismatch ゼロなら clean', () => {
      recordCall('findCoreTime')
      recordCall('findTurnaroundHour')
      const summary = dualRunStatsHandler() as { verdict: string }
      expect(summary.verdict).toBe('clean')
    })

    it('許容誤差内のみなら tolerance-only', () => {
      recordMismatch('findCoreTime', 1e-15, 'ok', 'ok', { hourCount: 10 })
      const summary = dualRunStatsHandler() as { verdict: string }
      expect(summary.verdict).toBe('tolerance-only')
    })

    it('誤差超過なら needs-investigation', () => {
      recordMismatch('findCoreTime', 0.001, 'ok', 'ok', { hourCount: 10 })
      const summary = dualRunStatsHandler() as { verdict: string }
      expect(summary.verdict).toBe('needs-investigation')
    })
  })

  describe('dualRunStatsHandler("log")', () => {
    it('mismatch ログ一覧を返す', () => {
      recordMismatch('findCoreTime', 1e-12, 'ok', 'ok', { hourCount: 10 })
      recordNullMismatch('findTurnaroundHour')

      const log = dualRunStatsHandler('log') as readonly {
        function: string
        classification: string
      }[]
      expect(log).toHaveLength(2)
      expect(log[0].function).toBe('findCoreTime')
      expect(log[0].classification).toBe('numeric-within-tolerance')
      expect(log[1].function).toBe('findTurnaroundHour')
      expect(log[1].classification).toBe('null-mismatch')
    })
  })

  describe('dualRunStatsHandler("reset")', () => {
    it('統計をリセットする', () => {
      recordCall('findCoreTime')
      recordMismatch('findCoreTime', 0.1, 'ok', 'ok', { hourCount: 10 })

      const result = dualRunStatsHandler('reset')
      expect(result).toBe('dual-run observation stats reset')

      const summary = dualRunStatsHandler() as { totalCalls: number; totalMismatches: number }
      expect(summary.totalCalls).toBe(0)
      expect(summary.totalMismatches).toBe(0)

      const log = dualRunStatsHandler('log') as readonly unknown[]
      expect(log).toHaveLength(0)
    })
  })

  describe('timeSlot 関数の記録', () => {
    it('timeSlot 関数を recordCall で記録できる', () => {
      recordCall('findCoreTime')
      recordCall('findTurnaroundHour')

      const summary = dualRunStatsHandler() as {
        totalCalls: number
        byFunction: Record<string, { calls: number }>
      }
      expect(summary.totalCalls).toBe(2)
      expect(summary.byFunction.findCoreTime.calls).toBe(1)
      expect(summary.byFunction.findTurnaroundHour.calls).toBe(1)
    })

    it('getSummary に timeSlot 関数が反映される', () => {
      const summary = dualRunStatsHandler() as {
        byFunction: Record<string, { calls: number }>
      }
      const fnNames = Object.keys(summary.byFunction)
      expect(fnNames).toContain('findCoreTime')
      expect(fnNames).toContain('findTurnaroundHour')
      expect(fnNames).toHaveLength(2)
    })
  })

  describe('mismatch classification', () => {
    it('numeric-within-tolerance: maxAbsDiff ≤ 1e-10 かつ invariant ok', () => {
      recordMismatch('findCoreTime', 1e-11, 'ok', 'ok', { hourCount: 10 })
      const log = dualRunStatsHandler('log') as readonly { classification: string }[]
      expect(log[0].classification).toBe('numeric-within-tolerance')
    })

    it('numeric-over-tolerance: maxAbsDiff > 1e-10 かつ invariant ok', () => {
      recordMismatch('findCoreTime', 1e-9, 'ok', 'ok', { hourCount: 10 })
      const log = dualRunStatsHandler('log') as readonly { classification: string }[]
      expect(log[0].classification).toBe('numeric-over-tolerance')
    })

    it('invariant-violation: いずれかの invariant が violated', () => {
      recordMismatch('findTurnaroundHour', 0.5, 'ok', 'violated', { hourCount: 10 })
      const log = dualRunStatsHandler('log') as readonly { classification: string }[]
      expect(log[0].classification).toBe('invariant-violation')
    })
  })
})
