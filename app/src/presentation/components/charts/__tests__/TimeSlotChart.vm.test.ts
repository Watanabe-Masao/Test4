/**
 * TimeSlotChart.vm.ts — pure view-model helper test
 *
 * 検証対象:
 * - buildModeLabel / buildTitleText (viewMode 分岐)
 * - buildChartLabelMap / buildYoYLabelMap
 * - formatChartTooltipEntry (amount/prevAmount → 円 / その他 → 点)
 * - formatYoYTooltipEntry (diff → +/- 付与)
 * - formatLegendLabel (fallback)
 * - getBarFill / getPrevDataKey / getYAxisTickFormatter (metric 分岐)
 * - format{ManYen, ManYenShort, Yen, Quantity, PeakHour, YoYBadgeText, DiffManYen, DiffQuantity, CompRatio, YoYDiffYen, MaxChangeHour, YoYTableDiff, YoYTableRatio}
 */
import { describe, it, expect } from 'vitest'
import {
  buildModeLabel,
  buildTitleText,
  buildChartLabelMap,
  buildYoYLabelMap,
  formatChartTooltipEntry,
  formatYoYTooltipEntry,
  formatLegendLabel,
  getBarFill,
  getPrevDataKey,
  getYAxisTickFormatter,
  formatManYen,
  formatManYenShort,
  formatYen,
  formatQuantity,
  formatPeakHour,
  formatYoYBadgeText,
  formatDiffManYen,
  formatDiffQuantity,
  formatCompRatio,
  formatYoYDiffYen,
  formatMaxChangeHour,
  formatYoYTableDiff,
  formatYoYTableRatio,
} from '../TimeSlotChart.vm'

// ─── Title / Label ──────────────────────────────────

describe('buildModeLabel', () => {
  it("'daily' → '（日平均）'", () => {
    expect(buildModeLabel('daily')).toBe('（日平均）')
  })

  it("'total' → ''", () => {
    expect(buildModeLabel('total')).toBe('')
  })
})

describe('buildTitleText', () => {
  it("viewMode='yoy' → 比較タイトル", () => {
    expect(buildTitleText('yoy', 'amount', '前年')).toBe('時間帯別 前年比較')
  })

  it("metricMode='amount' → '売上'", () => {
    expect(buildTitleText('chart', 'amount', '前年')).toBe('時間帯別売上')
  })

  it("metricMode='quantity' → '数量'", () => {
    expect(buildTitleText('chart', 'quantity', '前年')).toBe('時間帯別数量')
  })

  it("viewMode='kpi' → ' サマリー' 付与", () => {
    expect(buildTitleText('kpi', 'amount', '前年')).toBe('時間帯別売上 サマリー')
  })
})

// ─── Label Maps ─────────────────────────────────────

describe('buildChartLabelMap', () => {
  it('showPrev=true: current に curLabel を含める', () => {
    const map = buildChartLabelMap(true, '今期', '前年')
    expect(map.amount).toBe('今期売上')
    expect(map.quantity).toBe('今期数量')
    expect(map.prevAmount).toBe('前年売上')
    expect(map.prevQuantity).toBe('前年数量')
  })

  it('showPrev=false: デフォルト label', () => {
    const map = buildChartLabelMap(false, '今期', '前年')
    expect(map.amount).toBe('売上金額')
    expect(map.quantity).toBe('数量')
  })
})

describe('buildYoYLabelMap', () => {
  it('current / prevYear / diff の label map', () => {
    const map = buildYoYLabelMap('今期', '前年')
    expect(map).toEqual({ current: '今期', prevYear: '前年', diff: '差分' })
  })
})

// ─── Tooltip Formatters ─────────────────────────────

describe('formatChartTooltipEntry', () => {
  it("name='amount': '円' 単位", () => {
    const result = formatChartTooltipEntry(1000, 'amount', { amount: '売上' })
    expect(result[0]).toContain('円')
    expect(result[1]).toBe('売上')
  })

  it("name='prevAmount': '円' 単位", () => {
    const result = formatChartTooltipEntry(500, 'prevAmount', { prevAmount: '前年売上' })
    expect(result[0]).toContain('円')
  })

  it("name='quantity': '点' 単位", () => {
    const result = formatChartTooltipEntry(10, 'quantity', { quantity: '数量' })
    expect(result[0]).toContain('点')
  })

  it('labelMap 未登録 → name をそのまま', () => {
    const result = formatChartTooltipEntry(10, 'other', {})
    expect(result[1]).toBe('other')
  })
})

describe('formatYoYTooltipEntry', () => {
  it("name='diff' で正値: '+' prefix", () => {
    const result = formatYoYTooltipEntry(100, 'diff', { diff: '差分' })
    expect(result[0]).toContain('+')
    expect(result[0]).toContain('円')
  })

  it("name='diff' で負値: '-' そのまま", () => {
    const result = formatYoYTooltipEntry(-50, 'diff', { diff: '差分' })
    expect(result[0]).not.toContain('+')
    expect(result[0]).toContain('-')
  })

  it("name='current' 以外: prefix なし", () => {
    const result = formatYoYTooltipEntry(100, 'current', { current: '今期' })
    expect(result[0]).not.toContain('+')
    expect(result[0]).toContain('円')
  })

  it('value=null → 0 として扱う', () => {
    const result = formatYoYTooltipEntry(null, 'current', {})
    expect(result[0]).toContain('0')
  })
})

describe('formatLegendLabel', () => {
  it('labelMap にあれば置換', () => {
    expect(formatLegendLabel('amount', { amount: '売上' })).toBe('売上')
  })

  it('labelMap に無ければ value をそのまま', () => {
    expect(formatLegendLabel('unknown', {})).toBe('unknown')
  })
})

// ─── Chart config helpers ──────────────────────────

describe('getBarFill', () => {
  it("'amount' → amount gradient", () => {
    expect(getBarFill('amount')).toBe('url(#duckTimeAmtGrad)')
  })

  it("'quantity' → quantity gradient", () => {
    expect(getBarFill('quantity')).toBe('url(#duckTimeQtyGrad)')
  })
})

describe('getPrevDataKey', () => {
  it("'amount' → 'prevAmount'", () => {
    expect(getPrevDataKey('amount')).toBe('prevAmount')
  })

  it("'quantity' → 'prevQuantity'", () => {
    expect(getPrevDataKey('quantity')).toBe('prevQuantity')
  })
})

describe('getYAxisTickFormatter', () => {
  it("'amount' → toAxisYen 関数", () => {
    const fn = getYAxisTickFormatter('amount')
    expect(typeof fn).toBe('function')
    expect(typeof fn(1000)).toBe('string')
  })

  it("'quantity' → comma 付き文字列", () => {
    const fn = getYAxisTickFormatter('quantity')
    const result = fn(12345)
    expect(result).toContain('12,345')
  })
})

// ─── Format helpers ────────────────────────────────

describe('format helpers', () => {
  it('formatManYen: 10000 で割って「万円」付き', () => {
    expect(formatManYen(1_500_000)).toBe('150万円')
  })

  it('formatManYenShort: 「万」付き', () => {
    expect(formatManYenShort(2_500_000)).toBe('250万')
  })

  it('formatYen: comma + 円', () => {
    expect(formatYen(12345)).toBe('12,345円')
  })

  it('formatQuantity: comma + 点', () => {
    expect(formatQuantity(1234)).toBe('1,234点')
  })

  it('formatPeakHour: 時台 付き', () => {
    expect(formatPeakHour(15)).toBe('15時台')
  })
})

describe('formatYoYBadgeText', () => {
  it('ratio>=1: + prefix', () => {
    expect(formatYoYBadgeText(1.1)).toContain('+')
  })

  it('ratio<1: 符号なし (- は自動)', () => {
    expect(formatYoYBadgeText(0.9)).not.toContain('+')
  })
})

describe('formatDiffManYen', () => {
  it('正値: + prefix + 万円', () => {
    expect(formatDiffManYen(1_500_000)).toBe('+150万円')
  })

  it('負値: - 付き万円', () => {
    const result = formatDiffManYen(-1_500_000)
    expect(result).toContain('万円')
    expect(result).not.toContain('+')
  })
})

describe('formatDiffQuantity', () => {
  it('正値: + prefix + 点', () => {
    expect(formatDiffQuantity(100)).toBe('+100点')
  })

  it('負値: - 付き点', () => {
    const result = formatDiffQuantity(-50)
    expect(result).toContain('点')
    expect(result).not.toContain('+')
  })
})

describe('formatCompRatio', () => {
  it('{compLabel}比 + percent', () => {
    const result = formatCompRatio('前年', 1.1)
    expect(result).toMatch(/^前年比/)
  })
})

describe('formatYoYDiffYen', () => {
  it('正値: +円 付き', () => {
    const result = formatYoYDiffYen(1000, (v) => String(v))
    expect(result).toBe('+1000円')
  })

  it('負値: 符号のみ', () => {
    const result = formatYoYDiffYen(-500, (v) => String(v))
    expect(result).toBe('-500円')
  })
})

describe('formatMaxChangeHour', () => {
  it('isIncrease=true: "{hour}時 (+{diff})"', () => {
    const result = formatMaxChangeHour(15, 1000, (v) => String(v), true)
    expect(result).toBe('15時 (+1000)')
  })

  it('isIncrease=false: "{hour}時 ({diff})"', () => {
    const result = formatMaxChangeHour(18, -500, (v) => String(v), false)
    expect(result).toBe('18時 (-500)')
  })
})

describe('formatYoYTableDiff', () => {
  it('正値: + prefix', () => {
    expect(formatYoYTableDiff(1000)).toContain('+')
  })

  it('負値: 符号付き', () => {
    expect(formatYoYTableDiff(-1000)).toContain('-')
  })
})

describe('formatYoYTableRatio', () => {
  it('null → "-"', () => {
    expect(formatYoYTableRatio(null)).toBe('-')
  })

  it('number → percent 文字列', () => {
    const result = formatYoYTableRatio(0.5)
    expect(result).not.toBe('-')
    expect(typeof result).toBe('string')
  })
})
