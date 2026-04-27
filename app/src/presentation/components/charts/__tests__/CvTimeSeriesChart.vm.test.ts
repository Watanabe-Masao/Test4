/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import {
  detectTrendStatus,
  cvToColor,
  buildAllChartData,
  buildSalesByDateCode,
  getOverlayFlags,
  getSubtitleText,
  STATUS_MAP,
  VIEW_LABELS,
  OVERLAY_LABELS,
  type ViewMode,
} from '../CvTimeSeriesChart.vm'
import type { CategoryTrendPoint } from '@/application/hooks/duckdb'
import type { CategoryBenchmarkTrendRow } from '@/infrastructure/duckdb/queries/advancedAnalytics'

const makePoint = (
  dateKey: string,
  code: string,
  avgShare: number,
  cv: number,
  name = `cat-${code}`,
): CategoryTrendPoint =>
  ({
    dateKey,
    code,
    name,
    avgShare,
    cv,
    stability: 0,
    compositeScore: avgShare,
  }) as unknown as CategoryTrendPoint

describe('detectTrendStatus', () => {
  it('returns "unknown" when fewer than 3 points', () => {
    expect(detectTrendStatus([])).toBe('unknown')
    expect(
      detectTrendStatus([
        makePoint('2024-01-01', 'A', 0.1, 0.2),
        makePoint('2024-01-02', 'A', 0.1, 0.2),
      ]),
    ).toBe('unknown')
  })

  it('detects "stabilizing" when PI rises and CV falls', () => {
    const points: CategoryTrendPoint[] = [
      makePoint('2024-01-01', 'A', 0.1, 0.5),
      makePoint('2024-01-02', 'A', 0.1, 0.5),
      makePoint('2024-01-03', 'A', 0.2, 0.1),
      makePoint('2024-01-04', 'A', 0.2, 0.1),
    ]
    expect(detectTrendStatus(points)).toBe('stabilizing')
  })

  it('detects "promotion" when PI rises and CV rises', () => {
    const points: CategoryTrendPoint[] = [
      makePoint('2024-01-01', 'A', 0.1, 0.1),
      makePoint('2024-01-02', 'A', 0.1, 0.1),
      makePoint('2024-01-03', 'A', 0.2, 0.3),
      makePoint('2024-01-04', 'A', 0.2, 0.3),
    ]
    expect(detectTrendStatus(points)).toBe('promotion')
  })

  it('detects "degrading" when PI falls and CV rises', () => {
    const points: CategoryTrendPoint[] = [
      makePoint('2024-01-01', 'A', 0.3, 0.1),
      makePoint('2024-01-02', 'A', 0.3, 0.1),
      makePoint('2024-01-03', 'A', 0.1, 0.3),
      makePoint('2024-01-04', 'A', 0.1, 0.3),
    ]
    expect(detectTrendStatus(points)).toBe('degrading')
  })

  it('returns "stable" for flat series', () => {
    const points: CategoryTrendPoint[] = [
      makePoint('2024-01-01', 'A', 0.2, 0.2),
      makePoint('2024-01-02', 'A', 0.2, 0.2),
      makePoint('2024-01-03', 'A', 0.2, 0.2),
      makePoint('2024-01-04', 'A', 0.2, 0.2),
    ]
    expect(detectTrendStatus(points)).toBe('stable')
  })
})

describe('cvToColor', () => {
  it('returns green bucket for low ratio (<0.25)', () => {
    const { bg, text } = cvToColor(0.1, 1)
    expect(bg).toContain('34,197,94')
    expect(text).toBe('#166534')
  })

  it('returns yellow bucket for mid-low ratio', () => {
    expect(cvToColor(0.3, 1).text).toBe('#854d0e')
  })

  it('returns orange bucket for mid-high ratio', () => {
    expect(cvToColor(0.6, 1).text).toBe('#9a3412')
  })

  it('returns red bucket for high ratio', () => {
    expect(cvToColor(0.9, 1).text).toBe('#991b1b')
  })

  it('handles zero maxCv safely (no division by zero)', () => {
    const result = cvToColor(0, 0)
    expect(result).toHaveProperty('bg')
    expect(result).toHaveProperty('text')
  })
})

describe('buildAllChartData', () => {
  it('returns empty structures for empty input', () => {
    const result = buildAllChartData([], [], new Map())
    expect(result.cvLineData).toEqual([])
    expect(result.salesCvData).toEqual([])
    expect(result.heatmap.dateKeys).toEqual([])
    expect(result.heatmap.maxCv).toBe(0)
    expect(result.categoryNames.size).toBe(0)
  })

  it('aggregates trend points into cvLine, salesCv, heatmap, and detects category status', () => {
    const trendPoints: CategoryTrendPoint[] = [
      makePoint('2024-01-01', 'A', 0.1, 0.2, 'Apples'),
      makePoint('2024-01-02', 'A', 0.1, 0.2, 'Apples'),
      makePoint('2024-01-03', 'A', 0.2, 0.1, 'Apples'),
      makePoint('2024-01-04', 'A', 0.2, 0.1, 'Apples'),
    ]
    const salesByDateCode = new Map<string, number>([
      ['2024-01-01|A', 100],
      ['2024-01-02|A', 200],
    ])
    const result = buildAllChartData(trendPoints, ['A'], salesByDateCode)

    expect(result.cvLineData).toHaveLength(4)
    expect(result.cvLineData[0]?.dateKey).toBe('2024-01-01')
    expect(result.cvLineData[0]?.cv_A).toBe(0.2)
    expect(result.cvLineData[0]?.pi_A).toBe(0.1)

    expect(result.salesCvData[0]?.sales_A).toBe(100)
    expect(result.salesCvData[1]?.sales_A).toBe(200)
    // missing sales_by_date maps to 0
    expect(result.salesCvData[2]?.sales_A).toBe(0)

    expect(result.heatmap.dateKeys).toEqual([
      '2024-01-01',
      '2024-01-02',
      '2024-01-03',
      '2024-01-04',
    ])
    expect(result.heatmap.maxCv).toBe(0.2)

    expect(result.categoryNames.get('A')).toBe('Apples')
    expect(result.categoryStatuses.get('A')).toBe('stabilizing')
  })
})

describe('buildSalesByDateCode', () => {
  it('sums totalSales per dateKey|code and filters by topCodes', () => {
    const rows = [
      { dateKey: '2024-01-01', code: 'A', totalSales: 100 },
      { dateKey: '2024-01-01', code: 'A', totalSales: 50 },
      { dateKey: '2024-01-01', code: 'B', totalSales: 30 },
      { dateKey: '2024-01-02', code: 'A', totalSales: 200 },
    ] as unknown as readonly CategoryBenchmarkTrendRow[]
    const map = buildSalesByDateCode(rows, ['A'])
    expect(map.get('2024-01-01|A')).toBe(150)
    expect(map.get('2024-01-02|A')).toBe(200)
    expect(map.has('2024-01-01|B')).toBe(false)
  })

  it('returns empty map when topCodes is empty', () => {
    const rows = [
      { dateKey: '2024-01-01', code: 'A', totalSales: 100 },
    ] as unknown as readonly CategoryBenchmarkTrendRow[]
    expect(buildSalesByDateCode(rows, []).size).toBe(0)
  })
})

describe('getOverlayFlags', () => {
  it('cv only', () => {
    expect(getOverlayFlags('cv')).toEqual({ showCv: true, showPi: false })
  })

  it('pi only', () => {
    expect(getOverlayFlags('pi')).toEqual({ showCv: false, showPi: true })
  })

  it('both', () => {
    expect(getOverlayFlags('both')).toEqual({ showCv: true, showPi: true })
  })
})

describe('getSubtitleText', () => {
  const cases: [ViewMode, boolean, string][] = [
    ['cvLine', false, 'カテゴリ別 CV(変動係数)の日別推移'],
    ['cvLine', true, 'カテゴリ別 CV(変動係数) + PI値の日別推移'],
    ['salesCv', false, 'カテゴリ別 売上高 × CV(変動係数)の日別推移'],
    ['heatmap', true, 'カテゴリ × 日付のCV値ヒートマップ'],
  ]
  for (const [mode, showPi, expected] of cases) {
    it(`${mode} / showPi=${showPi}`, () => {
      expect(getSubtitleText(mode, showPi)).toBe(expected)
    })
  }
})

describe('static labels and maps', () => {
  it('STATUS_MAP contains all statuses', () => {
    expect(STATUS_MAP.stabilizing.label).toBe('定番化')
    expect(STATUS_MAP.unknown.label).toBe('不明')
  })

  it('VIEW_LABELS & OVERLAY_LABELS are defined', () => {
    expect(VIEW_LABELS.cvLine).toBeTruthy()
    expect(OVERLAY_LABELS.both).toBeTruthy()
  })
})
