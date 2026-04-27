/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import {
  indexColor,
  computeKpis,
  buildScatterData,
  computeChartHeight,
  buildTrendPivotData,
  buildNameMap,
  getSubtitle,
  getTableMetricLabel,
  getMetricDisplayName,
  extractTopCodes,
  resolveEffectiveAxis,
  LEVEL_LABELS,
  VIEW_LABELS,
  BENCHMARK_METRIC_LABELS,
  TYPE_LABELS,
  TYPE_COLORS,
  TREND_COLORS,
  ANALYSIS_AXIS_LABELS,
} from '../CategoryBenchmarkChartLogic'
import type { CategoryBenchmarkScore } from '@/application/queries/advanced'

function score(code: string, name: string, index: number, type: string): CategoryBenchmarkScore {
  return {
    code,
    name,
    index,
    stability: 0.5,
    productType: type,
  } as unknown as CategoryBenchmarkScore
}

describe('indexColor', () => {
  it('returns positive for index >= 70', () => {
    expect(indexColor(70)).toBe('#0ea5e9')
    expect(indexColor(100)).toBe('#0ea5e9')
  })
  it('returns caution for 40 <= index < 70', () => {
    expect(indexColor(40)).toBe('#eab308')
    expect(indexColor(69)).toBe('#eab308')
  })
  it('returns negative for index < 40', () => {
    expect(indexColor(0)).toBe('#f97316')
    expect(indexColor(39)).toBe('#f97316')
  })
})

describe('computeKpis', () => {
  it('returns null for empty scores', () => {
    expect(computeKpis([])).toBeNull()
  })

  it('computes top/bottom/averages/counts', () => {
    const scores = [
      score('A', 'A', 90, 'flagship'),
      score('B', 'B', 50, 'standard'),
      score('C', 'C', 20, 'unstable'),
      score('D', 'D', 80, 'flagship'),
    ]
    const kpi = computeKpis(scores)!
    expect(kpi.top.code).toBe('A')
    expect(kpi.bottom.code).toBe('C')
    expect(kpi.flagshipCount).toBe(2)
    expect(kpi.unstableCount).toBe(1)
    expect(kpi.avgIndex).toBe(60)
  })
})

describe('buildScatterData', () => {
  it('maps index to x and stability*100 to y', () => {
    const scores = [score('A', 'A', 75, 'flagship')]
    ;(scores[0] as unknown as { stability: number }).stability = 0.8
    const points = buildScatterData(scores)
    expect(points[0].x).toBe(75)
    expect(points[0].y).toBe(80)
    expect(points[0].code).toBe('A')
  })

  it('handles empty input', () => {
    expect(buildScatterData([])).toEqual([])
  })
})

describe('computeChartHeight', () => {
  it('enforces minimum of 200', () => {
    expect(computeChartHeight(0)).toBe(200)
    expect(computeChartHeight(5)).toBe(200)
  })
  it('scales with score count', () => {
    expect(computeChartHeight(10)).toBe(320)
    expect(computeChartHeight(20)).toBe(600)
  })
})

describe('buildTrendPivotData', () => {
  it('pivots trend data by date and sorts ascending', () => {
    const result = buildTrendPivotData([
      { dateKey: '2024-01-02', code: 'A', compositeScore: 10 },
      { dateKey: '2024-01-01', code: 'A', compositeScore: 20 },
      { dateKey: '2024-01-01', code: 'B', compositeScore: 30 },
    ])
    expect(result).toHaveLength(2)
    expect(result[0].dateKey).toBe('2024-01-01')
    expect(result[0].A).toBe(20)
    expect(result[0].B).toBe(30)
    expect(result[1].dateKey).toBe('2024-01-02')
    expect(result[1].A).toBe(10)
  })

  it('handles empty input', () => {
    expect(buildTrendPivotData([])).toEqual([])
  })
})

describe('buildNameMap', () => {
  it('maps code to name', () => {
    const map = buildNameMap([
      score('A', 'Alpha', 1, 'flagship'),
      score('B', 'Beta', 2, 'standard'),
    ])
    expect(map.get('A')).toBe('Alpha')
    expect(map.get('B')).toBe('Beta')
    expect(map.size).toBe(2)
  })
})

describe('getSubtitle', () => {
  it('returns date axis subtitle when effectiveAxis=date', () => {
    expect(getSubtitle('date', 'share')).toContain('期間別')
  })
  it('returns share-based subtitle for share metric', () => {
    expect(getSubtitle('store', 'share')).toContain('構成比')
  })
  it('returns PI-based subtitle for PI metrics', () => {
    expect(getSubtitle('store', 'salesPi')).toContain('金額PI値')
    expect(getSubtitle('store', 'quantityPi')).toContain('数量PI値')
  })
})

describe('getTableMetricLabel', () => {
  it('returns 日別構成比 for date axis', () => {
    expect(getTableMetricLabel('date', 'share')).toBe('日別構成比')
  })
  it('returns benchmark label for store axis', () => {
    expect(getTableMetricLabel('store', 'salesPi')).toBe(BENCHMARK_METRIC_LABELS.salesPi)
  })
})

describe('getMetricDisplayName', () => {
  it.each([
    ['share', '平均構成比'],
    ['salesPi', '金額PI値'],
    ['quantityPi', '数量PI値'],
  ] as const)('%s → %s', (metric, expected) => {
    expect(getMetricDisplayName(metric)).toBe(expected)
  })
})

describe('extractTopCodes', () => {
  it('returns top N codes', () => {
    const scores = [
      score('A', 'A', 1, 'flagship'),
      score('B', 'B', 2, 'flagship'),
      score('C', 'C', 3, 'flagship'),
    ]
    expect(extractTopCodes(scores, 2)).toEqual(['A', 'B'])
  })

  it('defaults to 10', () => {
    const scores = Array.from({ length: 15 }, (_, i) => score(`C${i}`, `N${i}`, i, 'standard'))
    expect(extractTopCodes(scores)).toHaveLength(10)
  })
})

describe('resolveEffectiveAxis', () => {
  it('returns date when isSingleStore', () => {
    expect(resolveEffectiveAxis('store', true)).toBe('date')
  })
  it('returns provided axis when multi-store', () => {
    expect(resolveEffectiveAxis('store', false)).toBe('store')
    expect(resolveEffectiveAxis('date', false)).toBe('date')
  })
})

describe('constants', () => {
  it('label maps are defined', () => {
    expect(LEVEL_LABELS.department).toBe('部門')
    expect(VIEW_LABELS.chart).toBe('チャート')
    expect(ANALYSIS_AXIS_LABELS.store).toBe('店舗別')
    expect(TYPE_LABELS.flagship).toBe('主力')
    expect(TYPE_COLORS.flagship).toBe('#22c55e')
    expect(TREND_COLORS).toHaveLength(10)
  })
})
