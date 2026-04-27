/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import {
  buildTemporalInputFromDashboardScope,
  DEFAULT_OVERLAY_CONFIG,
  type DashboardTemporalScope,
} from '../buildTemporalInputFromDashboardScope'

describe('DEFAULT_OVERLAY_CONFIG', () => {
  it('has Phase 5 defaults: sales / 7 / strict', () => {
    expect(DEFAULT_OVERLAY_CONFIG.metric).toBe('sales')
    expect(DEFAULT_OVERLAY_CONFIG.windowSize).toBe(7)
    expect(DEFAULT_OVERLAY_CONFIG.policy).toBe('strict')
  })
})

describe('buildTemporalInputFromDashboardScope', () => {
  const baseRange = {
    from: { year: 2024, month: 3, day: 1 },
    to: { year: 2024, month: 3, day: 31 },
  }

  it('returns null when currentDateRange is undefined', () => {
    const scope: DashboardTemporalScope = {
      currentDateRange: undefined,
      selectedStoreIds: new Set(['s1']),
    }
    expect(buildTemporalInputFromDashboardScope(scope)).toBeNull()
  })

  it('returns a MovingAverageInput using default config', () => {
    const scope: DashboardTemporalScope = {
      currentDateRange: baseRange,
      selectedStoreIds: new Set(['s1', 's2']),
    }
    const out = buildTemporalInputFromDashboardScope(scope)
    expect(out).not.toBeNull()
    expect(out?.frame.kind).toBe('analysis-frame')
    expect(out?.frame.anchorRange).toBe(baseRange)
    expect(out?.frame.analysisMode).toBe('movingAverage')
    if (out?.frame.analysisMode === 'movingAverage') {
      expect(out.frame.windowSize).toBe(7)
      expect(out.frame.direction).toBe('trailing')
    }
    expect(out?.frame.metric).toBe('sales')
    expect(out?.policy).toBe('strict')
  })

  it('passes store IDs in a deterministic array when set has members', () => {
    const scope: DashboardTemporalScope = {
      currentDateRange: baseRange,
      selectedStoreIds: new Set(['alpha', 'beta']),
    }
    const out = buildTemporalInputFromDashboardScope(scope)
    expect(out?.frame.storeIds).toEqual(['alpha', 'beta'])
  })

  it('returns empty array for storeIds when set is empty', () => {
    const scope: DashboardTemporalScope = {
      currentDateRange: baseRange,
      selectedStoreIds: new Set(),
    }
    const out = buildTemporalInputFromDashboardScope(scope)
    expect(out?.frame.storeIds).toEqual([])
  })

  it('respects custom config override', () => {
    const scope: DashboardTemporalScope = {
      currentDateRange: baseRange,
      selectedStoreIds: new Set(['s1']),
    }
    const out = buildTemporalInputFromDashboardScope(scope, {
      metric: 'customers',
      windowSize: 14,
      policy: 'partial',
      isPrevYear: true,
      extraMetrics: ['gross'],
    })
    if (out?.frame.analysisMode === 'movingAverage') {
      expect(out.frame.windowSize).toBe(14)
    }
    expect(out?.frame.metric).toBe('customers')
    expect(out?.policy).toBe('partial')
    expect(out?.isPrevYear).toBe(true)
    expect(out?.extraMetrics).toEqual(['gross'])
  })

  it('always uses granularity=day and direction=trailing', () => {
    const out = buildTemporalInputFromDashboardScope({
      currentDateRange: baseRange,
      selectedStoreIds: new Set(['s1']),
    })
    expect(out?.frame.granularity).toBe('day')
    if (out?.frame.analysisMode === 'movingAverage') {
      expect(out.frame.direction).toBe('trailing')
    }
  })
})
