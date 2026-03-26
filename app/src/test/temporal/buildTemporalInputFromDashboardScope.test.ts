/**
 * buildTemporalInputFromDashboardScope テスト
 *
 * Dashboard の header 文脈から MovingAverageInput を正しく組み立てることを検証。
 */
import { describe, it, expect } from 'vitest'
import {
  buildTemporalInputFromDashboardScope,
  DEFAULT_OVERLAY_CONFIG,
} from '@/application/usecases/temporal'
import type { DashboardTemporalScope } from '@/application/usecases/temporal'

const SCOPE: DashboardTemporalScope = {
  currentDateRange: {
    from: { year: 2026, month: 3, day: 1 },
    to: { year: 2026, month: 3, day: 31 },
  },
  selectedStoreIds: new Set(['S001', 'S002']),
}

describe('buildTemporalInputFromDashboardScope', () => {
  it('currentDateRange が anchorRange に入る', () => {
    const input = buildTemporalInputFromDashboardScope(SCOPE)
    expect(input).not.toBeNull()
    expect(input!.frame.anchorRange).toEqual(SCOPE.currentDateRange)
  })

  it('selectedStoreIds がそのまま frame に入る', () => {
    const input = buildTemporalInputFromDashboardScope(SCOPE)
    expect(input!.frame.storeIds).toEqual(['S001', 'S002'])
  })

  it('デフォルト config: metric=sales, windowSize=7, policy=strict', () => {
    const input = buildTemporalInputFromDashboardScope(SCOPE)
    expect(input!.frame.metric).toBe('sales')
    expect(input!.frame.windowSize).toBe(7)
    expect(input!.policy).toBe('strict')
    expect(input!.frame.direction).toBe('trailing')
    expect(input!.frame.analysisMode).toBe('movingAverage')
  })

  it('currentDateRange が undefined なら null を返す', () => {
    const scope: DashboardTemporalScope = {
      currentDateRange: undefined,
      selectedStoreIds: new Set(),
    }
    expect(buildTemporalInputFromDashboardScope(scope)).toBeNull()
  })

  it('カスタム config を渡せる', () => {
    const input = buildTemporalInputFromDashboardScope(SCOPE, {
      metric: 'customers',
      windowSize: 14,
      policy: 'partial',
    })
    expect(input!.frame.metric).toBe('customers')
    expect(input!.frame.windowSize).toBe(14)
    expect(input!.policy).toBe('partial')
  })

  it('selectedStoreIds が空でも frame.storeIds は空配列', () => {
    const scope: DashboardTemporalScope = {
      currentDateRange: SCOPE.currentDateRange,
      selectedStoreIds: new Set(),
    }
    const input = buildTemporalInputFromDashboardScope(scope)
    expect(input!.frame.storeIds).toEqual([])
  })

  it('DEFAULT_OVERLAY_CONFIG が期待値', () => {
    expect(DEFAULT_OVERLAY_CONFIG).toEqual({
      metric: 'sales',
      windowSize: 7,
      policy: 'strict',
    })
  })
})
