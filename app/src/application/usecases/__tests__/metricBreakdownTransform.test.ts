/**
 * metricBreakdownTransform.ts — pure ViewModel transformation test
 *
 * 検証対象:
 * - resolveStoreName: 'aggregate' / 未知 / Store 有
 * - buildFormattedInputs: inputs + linkedMetric 解決
 * - buildReverseLinks: 現在 metric を入力として使う他 metric
 * - buildEvidenceSummary: dataType 別件数
 * - buildBreakdownRows: breakdown = null → 空 / details 有無
 * - buildEvidenceRefsByType: 種別グループ化 + 31 件制限
 * - buildBreadcrumb: history → BreadcrumbItem
 * - buildScopeLabel: '{year}年{month}月 / {storeName}'
 * - formatMetricValue: yen / rate / count 各 unit
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import {
  resolveStoreName,
  buildFormattedInputs,
  buildReverseLinks,
  buildEvidenceSummary,
  buildBreakdownRows,
  buildEvidenceRefsByType,
  buildBreadcrumb,
  buildScopeLabel,
  formatMetricValue,
} from '../metricBreakdownTransform'
import type { Explanation, MetricId } from '@/domain/models/analysis'
import type { Store } from '@/domain/models/record'

function makeStore(id: string, code: string, name: string): Store {
  return { id, code, name } as unknown as Store
}

function makeExplanation(overrides: Partial<Explanation> = {}): Explanation {
  return {
    title: 'Metric',
    value: 100,
    unit: 'yen',
    inputs: [],
    evidenceRefs: [],
    breakdown: [],
    scope: { year: 2026, month: 4, storeId: 'aggregate' },
    ...overrides,
  } as unknown as Explanation
}

// ─── resolveStoreName ───────────────────────────

describe('resolveStoreName', () => {
  it("'aggregate' → '全店合計'", () => {
    expect(resolveStoreName('aggregate')).toBe('全店合計')
  })

  it('stores=undefined → storeId をそのまま', () => {
    expect(resolveStoreName('s1')).toBe('s1')
  })

  it('Store 有 → "name（code）" 形式', () => {
    const stores = new Map([['s1', makeStore('s1', '001', 'Store A')]])
    expect(resolveStoreName('s1', stores)).toBe('Store A（001）')
  })

  it('Store 無 → storeId', () => {
    const stores = new Map([['s1', makeStore('s1', '001', 'Store A')]])
    expect(resolveStoreName('unknown', stores)).toBe('unknown')
  })
})

// ─── buildFormattedInputs ───────────────────────

describe('buildFormattedInputs', () => {
  it('inputs の name / formattedValue を変換', () => {
    const inputs = [
      { name: '売上', value: 1000, unit: 'yen' as const },
      { name: '率', value: 0.3, unit: 'rate' as const },
    ]
    const result = buildFormattedInputs(inputs, new Map())
    expect(result).toHaveLength(2)
    expect(result[0].name).toBe('売上')
    expect(result[1].name).toBe('率')
  })

  it('linkedMetric: allExplanations に存在すれば伝搬', () => {
    const inputs = [{ name: 'x', value: 100, unit: 'yen' as const, metric: 'sales' as MetricId }]
    const allExplanations = new Map([['sales' as MetricId, makeExplanation({ title: '売上' })]])
    const result = buildFormattedInputs(inputs, allExplanations)
    expect(result[0].linkedMetric).toBe('sales')
  })

  it('linkedMetric: 存在しなければ undefined', () => {
    const inputs = [{ name: 'x', value: 100, unit: 'yen' as const, metric: 'unknown' as MetricId }]
    const result = buildFormattedInputs(inputs, new Map())
    expect(result[0].linkedMetric).toBeUndefined()
  })

  it('空 inputs → 空配列', () => {
    expect(buildFormattedInputs([], new Map())).toEqual([])
  })
})

// ─── buildReverseLinks ─────────────────────────

describe('buildReverseLinks', () => {
  it('現在 metric を input に持つ他の metric を返す', () => {
    const allExp = new Map<MetricId, Explanation>([
      [
        'gp' as MetricId,
        makeExplanation({
          title: '粗利',
          inputs: [{ name: 's', value: 100, unit: 'yen', metric: 'sales' as MetricId }],
        }),
      ],
      ['sales' as MetricId, makeExplanation({ title: '売上' })],
    ])
    const result = buildReverseLinks(allExp, 'sales' as MetricId)
    expect(result).toHaveLength(1)
    expect(result[0].metric).toBe('gp')
    expect(result[0].title).toBe('粗利')
  })

  it('currentMetric 自身は除外される', () => {
    const allExp = new Map<MetricId, Explanation>([
      [
        'sales' as MetricId,
        makeExplanation({
          inputs: [{ name: 's', value: 100, unit: 'yen', metric: 'sales' as MetricId }],
        }),
      ],
    ])
    const result = buildReverseLinks(allExp, 'sales' as MetricId)
    expect(result).toEqual([])
  })

  it('該当なし → 空配列', () => {
    const allExp = new Map<MetricId, Explanation>([
      ['gp' as MetricId, makeExplanation({ inputs: [] })],
    ])
    expect(buildReverseLinks(allExp, 'sales' as MetricId)).toEqual([])
  })
})

// ─── buildEvidenceSummary ─────────────────────

describe('buildEvidenceSummary', () => {
  it('空 evidenceRefs → 空配列', () => {
    expect(buildEvidenceSummary([])).toEqual([])
  })

  it('dataType ごとに件数を集計', () => {
    const refs = [
      { dataType: 'sales', kind: 'daily' as const, storeId: 's1', day: 1 },
      { dataType: 'sales', kind: 'daily' as const, storeId: 's1', day: 2 },
      { dataType: 'purchase', kind: 'daily' as const, storeId: 's1', day: 1 },
    ]
    const result = buildEvidenceSummary(refs as unknown as Explanation['evidenceRefs'])
    const sales = result.find((r) => r.dataType === 'sales')
    const purchase = result.find((r) => r.dataType === 'purchase')
    expect(sales?.count).toBe(2)
    expect(purchase?.count).toBe(1)
  })

  it('label は DATA_TYPE_LABELS から解決される', () => {
    const refs = [{ dataType: 'sales', kind: 'daily' as const, storeId: 's1', day: 1 }]
    const result = buildEvidenceSummary(refs as unknown as Explanation['evidenceRefs'])
    expect(result[0].label).toBe('売上データ')
  })

  it('未知の dataType → dataType をそのまま label に', () => {
    const refs = [{ dataType: 'unknown', kind: 'daily' as const, storeId: 's1', day: 1 }]
    const result = buildEvidenceSummary(refs as unknown as Explanation['evidenceRefs'])
    expect(result[0].label).toBe('unknown')
  })
})

// ─── buildBreakdownRows ───────────────────────

describe('buildBreakdownRows', () => {
  it('breakdown=null → 空配列', () => {
    expect(buildBreakdownRows(null as unknown as Explanation['breakdown'], 'yen')).toEqual([])
  })

  it('各 entry を row に変換 (hasDetails=false)', () => {
    const breakdown = [{ day: 1, label: '1日', value: 1000, details: [] }]
    const result = buildBreakdownRows(breakdown as unknown as Explanation['breakdown'], 'yen')
    expect(result).toHaveLength(1)
    expect(result[0].day).toBe(1)
    expect(result[0].dayLabel).toBe('1日')
    expect(result[0].hasDetails).toBe(false)
  })

  it('details 有 → hasDetails=true + details 変換', () => {
    const breakdown = [
      {
        day: 1,
        label: '1日',
        value: 1000,
        details: [{ label: 'X', value: 100, unit: 'yen' }],
      },
    ]
    const result = buildBreakdownRows(breakdown as unknown as Explanation['breakdown'], 'yen')
    expect(result[0].hasDetails).toBe(true)
    expect(result[0].details).toHaveLength(1)
    expect(result[0].details?.[0].label).toBe('X')
  })
})

// ─── buildEvidenceRefsByType ──────────────────

describe('buildEvidenceRefsByType', () => {
  it('空 → 空 Map', () => {
    expect(buildEvidenceRefsByType([]).size).toBe(0)
  })

  it('dataType ごとにグループ化', () => {
    const refs = [
      { dataType: 'sales', kind: 'daily' as const, storeId: 's1', day: 1 },
      { dataType: 'sales', kind: 'daily' as const, storeId: 's2', day: 2 },
      { dataType: 'purchase', kind: 'daily' as const, storeId: 's1', day: 1 },
    ]
    const result = buildEvidenceRefsByType(refs as unknown as Explanation['evidenceRefs'])
    expect(result.get('sales')).toHaveLength(2)
    expect(result.get('purchase')).toHaveLength(1)
  })

  it('31 件超は 31 件に切り詰め', () => {
    const refs = Array.from({ length: 40 }, (_, i) => ({
      dataType: 'sales',
      kind: 'daily' as const,
      storeId: 's1',
      day: i + 1,
    }))
    const result = buildEvidenceRefsByType(refs as unknown as Explanation['evidenceRefs'])
    expect(result.get('sales')).toHaveLength(31)
  })

  it("kind='daily' → '日別'、kind 他 → '集計'", () => {
    const refs = [
      { dataType: 'sales', kind: 'daily' as const, storeId: 's1', day: 1 },
      { dataType: 'sales', kind: 'aggregate' as const, storeId: 's1' },
    ]
    const result = buildEvidenceRefsByType(refs as unknown as Explanation['evidenceRefs'])
    const rows = result.get('sales')!
    expect(rows[0].kind).toBe('日別')
    expect(rows[1].kind).toBe('集計')
  })
})

// ─── buildBreadcrumb ──────────────────────────

describe('buildBreadcrumb', () => {
  it('history を BreadcrumbItem[] に変換', () => {
    const history = ['sales' as MetricId, 'gp' as MetricId]
    const allExp = new Map<MetricId, Explanation>([
      ['sales' as MetricId, makeExplanation({ title: '売上' })],
      ['gp' as MetricId, makeExplanation({ title: '粗利' })],
    ])
    const result = buildBreadcrumb(history, allExp)
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('売上')
    expect(result[0].isLast).toBe(false)
    expect(result[1].isLast).toBe(true)
  })

  it('allExplanations に無ければ id をタイトル代替に', () => {
    const result = buildBreadcrumb(['x' as MetricId], new Map())
    expect(result[0].title).toBe('x')
  })

  it('空 history → 空配列', () => {
    expect(buildBreadcrumb([], new Map())).toEqual([])
  })
})

// ─── buildScopeLabel ──────────────────────────

describe('buildScopeLabel', () => {
  it("'{year}年{month}月 / {storeName}' 形式", () => {
    const scope = { year: 2026, month: 4, storeId: 'aggregate' }
    expect(buildScopeLabel(scope)).toBe('2026年4月 / 全店合計')
  })

  it('stores 有 → store 名解決', () => {
    const scope = { year: 2026, month: 4, storeId: 's1' }
    const stores = new Map([['s1', makeStore('s1', '001', 'Store A')]])
    expect(buildScopeLabel(scope, stores)).toBe('2026年4月 / Store A（001）')
  })
})

// ─── formatMetricValue ────────────────────────

describe('formatMetricValue', () => {
  it("unit='yen' → 通貨", () => {
    const result = formatMetricValue(12345, 'yen')
    expect(result).toContain('12,345')
  })

  it("unit='rate' → percent", () => {
    const result = formatMetricValue(0.5, 'rate')
    expect(result).toContain('%')
  })

  it("unit='count' → カンマ区切り", () => {
    const result = formatMetricValue(1234, 'count')
    expect(result).toBe('1,234')
  })
})
