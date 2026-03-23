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
      recordCall('decompose2')
      recordCall('decompose2')
      recordCall('decompose3')

      const summary = dualRunStatsHandler() as {
        totalCalls: number
        byFunction: Record<string, { calls: number }>
      }
      expect(summary.totalCalls).toBe(3)
      expect(summary.byFunction.decompose2.calls).toBe(2)
      expect(summary.byFunction.decompose3.calls).toBe(1)
    })
  })

  describe('recordMismatch', () => {
    it('mismatch 統計を蓄積する', () => {
      recordCall('decompose2')
      recordMismatch('decompose2', 1e-12, 'ok', 'ok', { prevSales: 100, curSales: 200 })

      const summary = dualRunStatsHandler() as {
        totalMismatches: number
        globalMaxAbsDiff: number
        verdict: string
        byFunction: Record<string, { mismatches: number; maxAbsDiff: number }>
      }
      expect(summary.totalMismatches).toBe(1)
      expect(summary.globalMaxAbsDiff).toBe(1e-12)
      expect(summary.byFunction.decompose2.mismatches).toBe(1)
    })

    it('maxAbsDiff の最大値を追跡する', () => {
      recordMismatch('decompose3', 1e-12, 'ok', 'ok', { prevSales: 0, curSales: 0 })
      recordMismatch('decompose3', 5e-8, 'ok', 'ok', { prevSales: 0, curSales: 0 })
      recordMismatch('decompose3', 2e-10, 'ok', 'ok', { prevSales: 0, curSales: 0 })

      const summary = dualRunStatsHandler() as {
        globalMaxAbsDiff: number
        byFunction: Record<string, { maxAbsDiff: number }>
      }
      expect(summary.globalMaxAbsDiff).toBe(5e-8)
      expect(summary.byFunction.decompose3.maxAbsDiff).toBe(5e-8)
    })

    it('invariant violation をカウントする', () => {
      recordMismatch('decompose5', 0.5, 'ok', 'violated', { prevSales: 0, curSales: 0 })

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
      recordNullMismatch('decompose5')

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
      recordCall('decompose2')
      recordCall('decompose3')
      const summary = dualRunStatsHandler() as { verdict: string }
      expect(summary.verdict).toBe('clean')
    })

    it('許容誤差内のみなら tolerance-only', () => {
      recordMismatch('decompose2', 1e-15, 'ok', 'ok', { prevSales: 0, curSales: 0 })
      const summary = dualRunStatsHandler() as { verdict: string }
      expect(summary.verdict).toBe('tolerance-only')
    })

    it('誤差超過なら needs-investigation', () => {
      recordMismatch('decompose2', 0.001, 'ok', 'ok', { prevSales: 0, curSales: 0 })
      const summary = dualRunStatsHandler() as { verdict: string }
      expect(summary.verdict).toBe('needs-investigation')
    })
  })

  describe('dualRunStatsHandler("log")', () => {
    it('mismatch ログ一覧を返す', () => {
      recordMismatch('decompose2', 1e-12, 'ok', 'ok', { prevSales: 100, curSales: 200 })
      recordNullMismatch('decompose5')

      const log = dualRunStatsHandler('log') as readonly {
        function: string
        classification: string
      }[]
      expect(log).toHaveLength(2)
      expect(log[0].function).toBe('decompose2')
      expect(log[0].classification).toBe('numeric-within-tolerance')
      expect(log[1].function).toBe('decompose5')
      expect(log[1].classification).toBe('null-mismatch')
    })
  })

  describe('dualRunStatsHandler("reset")', () => {
    it('統計をリセットする', () => {
      recordCall('decompose2')
      recordMismatch('decompose2', 0.1, 'ok', 'ok', { prevSales: 0, curSales: 0 })

      const result = dualRunStatsHandler('reset')
      expect(result).toBe('dual-run observation stats reset')

      const summary = dualRunStatsHandler() as { totalCalls: number; totalMismatches: number }
      expect(summary.totalCalls).toBe(0)
      expect(summary.totalMismatches).toBe(0)

      const log = dualRunStatsHandler('log') as readonly unknown[]
      expect(log).toHaveLength(0)
    })
  })

  describe('grossProfit / budgetAnalysis 関数の記録', () => {
    it('grossProfit 関数を recordCall で記録できる', () => {
      recordCall('calculateInvMethod')
      recordCall('calculateEstMethod')
      recordCall('calculateInventoryCost')

      const summary = dualRunStatsHandler() as {
        totalCalls: number
        byFunction: Record<string, { calls: number }>
      }
      expect(summary.totalCalls).toBe(3)
      expect(summary.byFunction.calculateInvMethod.calls).toBe(1)
      expect(summary.byFunction.calculateEstMethod.calls).toBe(1)
      expect(summary.byFunction.calculateInventoryCost.calls).toBe(1)
    })

    it('grossProfit 関数の recordMismatch が集計される', () => {
      recordMismatch('calculateInvMethod', 1e-8, 'ok', 'ok', { sales: 100000 })
      recordMismatch('calculateMarkupRates', 0.5, 'ok', 'violated', { coreSalesPrice: 50000 })

      const summary = dualRunStatsHandler() as {
        totalMismatches: number
        totalInvariantViolations: number
        byFunction: Record<string, { mismatches: number; invariantViolations: number }>
      }
      expect(summary.totalMismatches).toBe(2)
      expect(summary.totalInvariantViolations).toBe(1)
      expect(summary.byFunction.calculateInvMethod.mismatches).toBe(1)
      expect(summary.byFunction.calculateMarkupRates.invariantViolations).toBe(1)
    })

    it('budgetAnalysis 関数を recordCall / recordMismatch で記録できる', () => {
      recordCall('calculateBudgetAnalysis')
      recordCall('calculateGrossProfitBudget')
      recordMismatch('calculateBudgetAnalysis', 1e-12, 'ok', 'ok', { sales: 500000 })

      const summary = dualRunStatsHandler() as {
        totalCalls: number
        totalMismatches: number
        byFunction: Record<string, { calls: number; mismatches: number }>
      }
      expect(summary.totalCalls).toBe(2)
      expect(summary.totalMismatches).toBe(1)
      expect(summary.byFunction.calculateBudgetAnalysis.calls).toBe(1)
      expect(summary.byFunction.calculateBudgetAnalysis.mismatches).toBe(1)
      expect(summary.byFunction.calculateGrossProfitBudget.calls).toBe(1)
    })

    it('getSummary に全関数が反映される', () => {
      const summary = dualRunStatsHandler() as {
        byFunction: Record<string, { calls: number }>
      }
      const fnNames = Object.keys(summary.byFunction)
      expect(fnNames).toContain('decompose2')
      expect(fnNames).toContain('calculateInvMethod')
      expect(fnNames).toContain('calculateEstMethod')
      expect(fnNames).toContain('calculateCoreSales')
      expect(fnNames).toContain('calculateDiscountRate')
      expect(fnNames).toContain('calculateDiscountImpact')
      expect(fnNames).toContain('calculateMarkupRates')
      expect(fnNames).toContain('calculateTransferTotals')
      expect(fnNames).toContain('calculateInventoryCost')
      expect(fnNames).toContain('calculateBudgetAnalysis')
      expect(fnNames).toContain('calculateGrossProfitBudget')
      expect(fnNames).toContain('calculateStdDev')
      expect(fnNames).toContain('detectAnomalies')
      expect(fnNames).toContain('calculateWMA')
      expect(fnNames).toContain('linearRegression')
      expect(fnNames).toContain('analyzeTrend')
      expect(fnNames).toContain('findCoreTime')
      expect(fnNames).toContain('findTurnaroundHour')
      expect(fnNames).toHaveLength(21)
    })

    it('grossProfit 関数の recordNullMismatch', () => {
      recordNullMismatch('calculateInvMethod')

      const summary = dualRunStatsHandler() as {
        totalNullMismatches: number
        byFunction: Record<string, { nullMismatches: number }>
      }
      expect(summary.totalNullMismatches).toBe(1)
      expect(summary.byFunction.calculateInvMethod.nullMismatches).toBe(1)
    })
  })

  describe('mismatch classification', () => {
    it('numeric-within-tolerance: maxAbsDiff ≤ 1e-10 かつ invariant ok', () => {
      recordMismatch('decompose2', 1e-11, 'ok', 'ok', { prevSales: 0, curSales: 0 })
      const log = dualRunStatsHandler('log') as readonly { classification: string }[]
      expect(log[0].classification).toBe('numeric-within-tolerance')
    })

    it('numeric-over-tolerance: maxAbsDiff > 1e-10 かつ invariant ok', () => {
      recordMismatch('decompose2', 1e-9, 'ok', 'ok', { prevSales: 0, curSales: 0 })
      const log = dualRunStatsHandler('log') as readonly { classification: string }[]
      expect(log[0].classification).toBe('numeric-over-tolerance')
    })

    it('invariant-violation: いずれかの invariant が violated', () => {
      recordMismatch('decompose3', 0.5, 'ok', 'violated', { prevSales: 0, curSales: 0 })
      const log = dualRunStatsHandler('log') as readonly { classification: string }[]
      expect(log[0].classification).toBe('invariant-violation')
    })
  })
})
