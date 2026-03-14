/**
 * Resolver → Registry → UI 統合テスト
 *
 * 代表的な KPI シナリオで、METRIC_DEFS → resolveMetric → deriveDisplayMode の
 * 全パイプラインが期待通りに動作することを検証する。
 *
 * 個々の Stage テストは metricResolver.test.ts にある。
 * ここでは「実際の registry 定義を使った端到端の振る舞い」を検証する。
 */
import { describe, it, expect } from 'vitest'
import { resolveMetric, deriveDisplayMode } from './metricResolver'
import { METRIC_DEFS } from './metricDefs'
import type { MetricId } from '../models/Explanation'

/** resolveMetric + deriveDisplayMode のヘルパー */
function resolveAndDisplay(
  metricId: MetricId,
  rawValue: number | null | undefined,
  warningCodes: readonly string[] = [],
) {
  const warningMap = new Map<string, readonly string[]>()
  if (warningCodes.length > 0) {
    warningMap.set(metricId, warningCodes)
  }
  const resolution = resolveMetric(metricId, rawValue, warningMap)
  const displayMode = deriveDisplayMode(resolution)
  return { resolution, displayMode }
}

// ═══════════════════════════════════════════════════════════
// シナリオ 1: 推定法 — calc warning で authoritative 拒否
// ═══════════════════════════════════════════════════════════

describe('シナリオ 1: 推定法 calc warning 拒否', () => {
  const estKpis: MetricId[] = ['estMethodCogs', 'estMethodMargin', 'estMethodMarginRate']

  for (const metricId of estKpis) {
    describe(metricId, () => {
      it('正常値 → authoritative 表示', () => {
        const { resolution, displayMode } = resolveAndDisplay(metricId, 100000)
        expect(resolution.status).toBe('ok')
        expect(resolution.authoritativeAccepted).toBe(true)
        expect(displayMode).toBe('authoritative')
      })

      it('calc warning → partial + authoritative 拒否 → reference 表示', () => {
        const { resolution, displayMode } = resolveAndDisplay(metricId, 100000, [
          'calc_markup_rate_negative',
        ])
        expect(resolution.status).toBe('partial')
        expect(resolution.authoritativeAccepted).toBe(false)
        expect(displayMode).toBe('reference')
      })

      it('calc critical warning → invalid + hidden', () => {
        const { resolution, displayMode } = resolveAndDisplay(metricId, 100000, [
          'calc_discount_rate_out_of_domain',
        ])
        expect(resolution.status).toBe('invalid')
        expect(resolution.authoritativeAccepted).toBe(false)
        expect(resolution.exploratoryAllowed).toBe(false)
        expect(displayMode).toBe('hidden')
      })

      it('null 値 + fallbackRule=null → invalid + hidden', () => {
        const { resolution, displayMode } = resolveAndDisplay(metricId, null)
        expect(resolution.value).toBeNull()
        expect(resolution.status).toBe('invalid')
        expect(displayMode).toBe('hidden')
      })
    })
  }
})

// ═══════════════════════════════════════════════════════════
// シナリオ 2: 予算達成率 — partial でも authoritative
// ═══════════════════════════════════════════════════════════

describe('シナリオ 2: 予算達成率 partial 許可', () => {
  const budgetKpis: MetricId[] = [
    'budgetAchievementRate',
    'grossProfitBudgetAchievement',
    'requiredDailySales',
  ]

  for (const metricId of budgetKpis) {
    describe(metricId, () => {
      it('正常値 → authoritative', () => {
        const { displayMode } = resolveAndDisplay(metricId, 0.85)
        expect(displayMode).toBe('authoritative')
      })

      it('warning あり → partial + authoritative 可（policy 許可）', () => {
        const { resolution, displayMode } = resolveAndDisplay(metricId, 0.85, [
          'obs_window_incomplete',
        ])
        expect(resolution.status).toBe('partial')
        expect(resolution.authoritativeAccepted).toBe(true)
        expect(displayMode).toBe('authoritative')
      })

      it('fallback=zero → authoritative', () => {
        const { resolution, displayMode } = resolveAndDisplay(metricId, null)
        expect(resolution.value).toBe(0)
        expect(resolution.isFallback).toBe(true)
        expect(displayMode).toBe('authoritative')
      })
    })
  }
})

// ═══════════════════════════════════════════════════════════
// シナリオ 3: 予測系 — partial + invalid exploratory 許可
// ═══════════════════════════════════════════════════════════

describe('シナリオ 3: 予測系 invalid exploratory 許可', () => {
  const forecastKpis: MetricId[] = [
    'projectedSales',
    'projectedAchievement',
    'projectedGrossProfit',
    'projectedGPAchievement',
  ]

  for (const metricId of forecastKpis) {
    describe(metricId, () => {
      it('正常値 → authoritative', () => {
        const { displayMode } = resolveAndDisplay(metricId, 5000000)
        expect(displayMode).toBe('authoritative')
      })

      it('warning あり → partial + authoritative 可', () => {
        const { resolution, displayMode } = resolveAndDisplay(metricId, 5000000, [
          'cmp_prior_year_insufficient',
        ])
        expect(resolution.status).toBe('partial')
        expect(resolution.authoritativeAccepted).toBe(true)
        expect(displayMode).toBe('authoritative')
      })

      it('critical warning → invalid + exploratory 可 → reference', () => {
        const { resolution, displayMode } = resolveAndDisplay(metricId, 5000000, [
          'calc_discount_rate_negative',
        ])
        expect(resolution.status).toBe('invalid')
        expect(resolution.exploratoryAllowed).toBe(true)
        expect(displayMode).toBe('reference')
      })
    })
  }
})

// ═══════════════════════════════════════════════════════════
// シナリオ 4: 在庫法粗利率 — strict default（partial 不可）
// ═══════════════════════════════════════════════════════════

describe('シナリオ 4: 在庫法粗利率 strict', () => {
  it('正常値 → authoritative', () => {
    const { displayMode } = resolveAndDisplay('invMethodGrossProfitRate', 0.28)
    expect(displayMode).toBe('authoritative')
  })

  it('warning → partial → authoritative 不可 → reference', () => {
    const { resolution, displayMode } = resolveAndDisplay('invMethodGrossProfitRate', 0.28, [
      'obs_window_incomplete',
    ])
    expect(resolution.status).toBe('partial')
    expect(resolution.authoritativeAccepted).toBe(false)
    expect(displayMode).toBe('reference')
  })

  it('null → invalid → hidden', () => {
    const { displayMode } = resolveAndDisplay('invMethodGrossProfitRate', null)
    expect(displayMode).toBe('hidden')
  })
})

// ═══════════════════════════════════════════════════════════
// シナリオ 5: B分類 KPI — デフォルト policy（safe-side）
// ═══════════════════════════════════════════════════════════

describe('シナリオ 5: B分類 KPI デフォルト policy', () => {
  const bGroupKpis: MetricId[] = [
    'budgetProgressRate',
    'budgetElapsedRate',
    'budgetProgressGap',
    'grossProfitBudgetVariance',
    'grossProfitProgressGap',
  ]

  for (const metricId of bGroupKpis) {
    describe(metricId, () => {
      it('正常値 → authoritative', () => {
        const { displayMode } = resolveAndDisplay(metricId, 0.45)
        expect(displayMode).toBe('authoritative')
      })

      it('warning → partial → reference（デフォルト: partial 不可）', () => {
        const { resolution, displayMode } = resolveAndDisplay(metricId, 0.45, [
          'obs_window_incomplete',
        ])
        expect(resolution.status).toBe('partial')
        expect(resolution.authoritativeAccepted).toBe(false)
        expect(displayMode).toBe('reference')
      })

      it('fallbackRule=zero → fallback → authoritative', () => {
        const { resolution, displayMode } = resolveAndDisplay(metricId, null)
        expect(resolution.value).toBe(0)
        expect(resolution.isFallback).toBe(true)
        expect(resolution.status).toBe('fallback')
        expect(displayMode).toBe('authoritative')
      })
    })
  }
})

// ═══════════════════════════════════════════════════════════
// シナリオ 6: C分類 KPI — 生データ集計（policy なし）
// ═══════════════════════════════════════════════════════════

describe('シナリオ 6: C分類 KPI 生データ集計', () => {
  it('salesTotal: 正常値 → ok + authoritative', () => {
    const { resolution, displayMode } = resolveAndDisplay('salesTotal', 10000000)
    expect(resolution.status).toBe('ok')
    expect(displayMode).toBe('authoritative')
  })

  it('salesTotal: null + fallbackRule 未設定 → invalid + hidden', () => {
    const { resolution, displayMode } = resolveAndDisplay('salesTotal', null)
    expect(resolution.status).toBe('invalid')
    expect(displayMode).toBe('hidden')
  })
})

// ═══════════════════════════════════════════════════════════
// Registry 整合性チェック
// ═══════════════════════════════════════════════════════════

describe('Registry 整合性', () => {
  it('acceptancePolicy を持つ KPI は authoritativeOwner も持つ', () => {
    const metricIds = Object.keys(METRIC_DEFS) as MetricId[]
    for (const id of metricIds) {
      const meta = METRIC_DEFS[id]
      if (meta.acceptancePolicy != null) {
        expect(
          meta.authoritativeOwner,
          `${id} は acceptancePolicy があるが authoritativeOwner がない`,
        ).toBeDefined()
      }
    }
  })

  it('fallbackRule を持つ KPI は authoritativeOwner も持つ', () => {
    const metricIds = Object.keys(METRIC_DEFS) as MetricId[]
    for (const id of metricIds) {
      const meta = METRIC_DEFS[id]
      if (meta.fallbackRule != null) {
        expect(
          meta.authoritativeOwner,
          `${id} は fallbackRule があるが authoritativeOwner がない`,
        ).toBeDefined()
      }
    }
  })

  it('blockingWarningCategories の値は有効な category', () => {
    const validCategories = ['calc', 'obs', 'cmp', 'fb', 'auth']
    const metricIds = Object.keys(METRIC_DEFS) as MetricId[]
    for (const id of metricIds) {
      const policy = METRIC_DEFS[id].acceptancePolicy
      if (policy?.blockingWarningCategories) {
        for (const cat of policy.blockingWarningCategories) {
          expect(validCategories, `${id} の blockingWarningCategories に不正値: ${cat}`).toContain(
            cat,
          )
        }
      }
    }
  })
})
