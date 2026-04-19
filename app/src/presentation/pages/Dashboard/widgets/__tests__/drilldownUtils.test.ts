import { describe, it, expect } from 'vitest'
import {
  fmtSen,
  aggregateForDrill,
  buildDrillItems,
  COLORS,
} from '@/presentation/pages/Dashboard/widgets/drilldownUtils'
import type { CategoryLeafDailyEntry } from '@/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types'

const makeRec = (
  dept: string,
  line: string,
  klass: string,
  amount: number,
  quantity: number,
): CategoryLeafDailyEntry =>
  ({
    department: { code: dept, name: `Dept${dept}` },
    line: { code: line, name: `Line${line}` },
    klass: { code: klass, name: `Klass${klass}` },
    deptCode: dept,
    deptName: `Dept${dept}`,
    lineCode: line,
    lineName: `Line${line}`,
    klassCode: klass,
    klassName: `Klass${klass}`,
    totalAmount: amount,
    totalQuantity: quantity,
  }) as unknown as CategoryLeafDailyEntry

describe('fmtSen', () => {
  it('formats zero correctly', () => {
    expect(fmtSen(0)).toBe('0千')
  })

  it('rounds to nearest 1000', () => {
    expect(fmtSen(1500)).toBe('2千')
    expect(fmtSen(1499)).toBe('1千')
  })

  it('formats large values with thousand separator', () => {
    expect(fmtSen(1_234_000)).toBe('1,234千')
  })

  it('handles negative values', () => {
    expect(fmtSen(-1500)).toBe('-1千')
  })
})

describe('COLORS palette', () => {
  it('has 15 colors', () => {
    expect(COLORS).toHaveLength(15)
  })

  it('contains only non-empty strings', () => {
    for (const c of COLORS) {
      expect(typeof c).toBe('string')
      expect(c.length).toBeGreaterThan(0)
    }
  })
})

describe('aggregateForDrill', () => {
  const records: CategoryLeafDailyEntry[] = [
    makeRec('D1', 'L1', 'K1', 100, 5),
    makeRec('D1', 'L1', 'K2', 200, 10),
    makeRec('D1', 'L2', 'K3', 50, 2),
    makeRec('D2', 'L3', 'K4', 300, 15),
  ]

  it('aggregates by department', () => {
    const map = aggregateForDrill(records, 'department')
    expect(map.size).toBe(2)
    const d1 = map.get('D1')
    expect(d1?.amount).toBe(350)
    expect(d1?.quantity).toBe(17)
    expect(d1?.children.size).toBe(2)
    const d2 = map.get('D2')
    expect(d2?.amount).toBe(300)
    expect(d2?.quantity).toBe(15)
  })

  it('aggregates by line', () => {
    const map = aggregateForDrill(records, 'line')
    expect(map.size).toBe(3)
    expect(map.get('L1')?.amount).toBe(300)
    expect(map.get('L1')?.quantity).toBe(15)
    expect(map.get('L1')?.children.size).toBe(2)
  })

  it('aggregates by klass with no children', () => {
    const map = aggregateForDrill(records, 'klass')
    expect(map.size).toBe(4)
    expect(map.get('K1')?.amount).toBe(100)
    expect(map.get('K1')?.children.size).toBe(0)
  })

  it('returns empty map for empty records', () => {
    const map = aggregateForDrill([], 'department')
    expect(map.size).toBe(0)
  })
})

describe('buildDrillItems', () => {
  const records: CategoryLeafDailyEntry[] = [
    makeRec('D1', 'L1', 'K1', 200, 10),
    makeRec('D2', 'L2', 'K2', 100, 5),
  ]

  it('builds sorted items with correct totals', () => {
    const items = buildDrillItems(records, [], 'department', 'amount', new Map(), false)
    expect(items).toHaveLength(2)
    expect(items[0].code).toBe('D1')
    expect(items[0].amount).toBe(200)
    expect(items[1].code).toBe('D2')
  })

  it('computes pct for amount metric', () => {
    const items = buildDrillItems(records, [], 'department', 'amount', new Map(), false)
    // D1 amount = 200 / total 300 = 66.67
    expect(items[0].pct).toBeCloseTo((200 / 300) * 100, 4)
    expect(items[1].pct).toBeCloseTo((100 / 300) * 100, 4)
  })

  it('computes pct for quantity metric', () => {
    const items = buildDrillItems(records, [], 'department', 'quantity', new Map(), false)
    // D1 qty=10 / total 15 = 66.67
    expect(items[0].pct).toBeCloseTo((10 / 15) * 100, 4)
  })

  it('returns 0 pct when total is zero', () => {
    const zeroRecs = [makeRec('D1', 'L1', 'K1', 0, 0)]
    const items = buildDrillItems(zeroRecs, [], 'department', 'amount', new Map(), false)
    expect(items[0].pct).toBe(0)
  })

  it('computes YoY fields when prev records are provided', () => {
    const prev = [makeRec('D1', 'L1', 'K1', 100, 5)]
    const items = buildDrillItems(records, prev, 'department', 'amount', new Map(), true)
    const d1 = items.find((i) => i.code === 'D1')!
    expect(d1.prevAmount).toBe(100)
    expect(d1.prevQuantity).toBe(5)
    expect(d1.yoyRatio).toBe(2)
    expect(d1.yoyDiff).toBe(100)
    expect(d1.yoyQtyRatio).toBe(2)
    expect(d1.yoyQtyDiff).toBe(5)
  })

  it('leaves yoyRatio undefined when prev missing', () => {
    const items = buildDrillItems(records, [], 'department', 'amount', new Map(), true)
    expect(items[0].yoyRatio).toBeUndefined()
    expect(items[0].prevAmount).toBeUndefined()
  })

  it('uses provided colorMap override', () => {
    const colorMap = new Map([['D1', '#ff0000']])
    const items = buildDrillItems(records, [], 'department', 'amount', colorMap, false)
    expect(items[0].color).toBe('#ff0000')
    // Fallback color for D2
    expect(items[1].color).toBe(COLORS[1])
  })

  it('falls back to default color palette when colorMap has no entry', () => {
    const items = buildDrillItems(records, [], 'department', 'amount', new Map(), false)
    expect(items[0].color).toBe(COLORS[0])
    expect(items[1].color).toBe(COLORS[1])
  })

  it('returns empty array for empty records', () => {
    const items = buildDrillItems([], [], 'department', 'amount', new Map(), false)
    expect(items).toEqual([])
  })
})
