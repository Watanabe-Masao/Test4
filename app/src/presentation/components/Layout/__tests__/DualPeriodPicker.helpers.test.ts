/**
 * DualPeriodPicker.helpers — pure utility tests
 *
 * 検証対象:
 * - toJsDate / fromJsDate: CalendarDate ↔ JS Date の双方向変換（月の 0/1-index 補正）
 * - buildP1Presets: 月全日 / 上旬 / 中旬 / 下旬 プリセット生成
 * - findActivePresetKey: 現在の period1 範囲に一致する preset key を返す
 */
import { describe, it, expect } from 'vitest'
import {
  toJsDate,
  fromJsDate,
  buildP1Presets,
  findActivePresetKey,
  type P1Preset,
} from '../DualPeriodPicker.helpers'

describe('toJsDate', () => {
  it('month を 1-index → 0-index に変換する（3月 → JS Date の 2）', () => {
    const d = toJsDate({ year: 2026, month: 3, day: 15 })
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(2) // 0-index
    expect(d.getDate()).toBe(15)
  })

  it('1月 → JS Date の 0', () => {
    const d = toJsDate({ year: 2026, month: 1, day: 1 })
    expect(d.getMonth()).toBe(0)
  })

  it('12月 → JS Date の 11', () => {
    const d = toJsDate({ year: 2026, month: 12, day: 31 })
    expect(d.getMonth()).toBe(11)
    expect(d.getDate()).toBe(31)
  })
})

describe('fromJsDate', () => {
  it('month を 0-index → 1-index に戻す', () => {
    const jsDate = new Date(2026, 2, 15) // March 15
    expect(fromJsDate(jsDate)).toEqual({ year: 2026, month: 3, day: 15 })
  })

  it('1月は 0 → 1 に変換', () => {
    const jsDate = new Date(2026, 0, 1)
    expect(fromJsDate(jsDate)).toEqual({ year: 2026, month: 1, day: 1 })
  })

  it('toJsDate と往復可換', () => {
    const original = { year: 2026, month: 7, day: 20 }
    expect(fromJsDate(toJsDate(original))).toEqual(original)
  })
})

describe('buildP1Presets', () => {
  it('4 種類のプリセットを返す', () => {
    const presets = buildP1Presets(2026, 3, 31)
    expect(presets).toHaveLength(4)
    expect(presets.map((p) => p.key)).toEqual(['full', 'early', 'mid', 'late'])
  })

  it('月全日は 1 日 〜 daysInMonth', () => {
    const presets = buildP1Presets(2026, 3, 31)
    const full = presets.find((p) => p.key === 'full')
    expect(full?.range).toEqual({
      from: { year: 2026, month: 3, day: 1 },
      to: { year: 2026, month: 3, day: 31 },
    })
  })

  it('上旬は 1-10 日', () => {
    const early = buildP1Presets(2026, 3, 31).find((p) => p.key === 'early')
    expect(early?.range).toEqual({
      from: { year: 2026, month: 3, day: 1 },
      to: { year: 2026, month: 3, day: 10 },
    })
  })

  it('中旬は 11-20 日', () => {
    const mid = buildP1Presets(2026, 3, 31).find((p) => p.key === 'mid')
    expect(mid?.range).toEqual({
      from: { year: 2026, month: 3, day: 11 },
      to: { year: 2026, month: 3, day: 20 },
    })
  })

  it('下旬は 21 日 〜 daysInMonth（28 日の月は 21-28）', () => {
    const late28 = buildP1Presets(2026, 2, 28).find((p) => p.key === 'late')
    expect(late28?.range.to).toEqual({ year: 2026, month: 2, day: 28 })
  })

  it('29 日以下の月でも下旬範囲は 21 日から開始', () => {
    const late = buildP1Presets(2026, 2, 29).find((p) => p.key === 'late')
    expect(late?.range.from).toEqual({ year: 2026, month: 2, day: 21 })
    expect(late?.range.to).toEqual({ year: 2026, month: 2, day: 29 })
  })

  it('全 preset に label が付く', () => {
    const presets = buildP1Presets(2026, 3, 31)
    for (const p of presets) expect(p.label).toBeTruthy()
    expect(presets.find((p) => p.key === 'full')?.label).toBe('月全日')
    expect(presets.find((p) => p.key === 'early')?.label).toBe('上旬')
    expect(presets.find((p) => p.key === 'mid')?.label).toBe('中旬')
    expect(presets.find((p) => p.key === 'late')?.label).toBe('下旬')
  })
})

describe('findActivePresetKey', () => {
  const presets: readonly P1Preset[] = buildP1Presets(2026, 3, 31)

  it('月全日と一致 → key=full', () => {
    expect(
      findActivePresetKey(
        { from: { year: 2026, month: 3, day: 1 }, to: { year: 2026, month: 3, day: 31 } },
        presets,
      ),
    ).toBe('full')
  })

  it('上旬と一致 → key=early', () => {
    expect(
      findActivePresetKey(
        { from: { year: 2026, month: 3, day: 1 }, to: { year: 2026, month: 3, day: 10 } },
        presets,
      ),
    ).toBe('early')
  })

  it('中旬と一致 → key=mid', () => {
    expect(
      findActivePresetKey(
        { from: { year: 2026, month: 3, day: 11 }, to: { year: 2026, month: 3, day: 20 } },
        presets,
      ),
    ).toBe('mid')
  })

  it('下旬と一致 → key=late', () => {
    expect(
      findActivePresetKey(
        { from: { year: 2026, month: 3, day: 21 }, to: { year: 2026, month: 3, day: 31 } },
        presets,
      ),
    ).toBe('late')
  })

  it('どれにも一致しない手動指定範囲 → null', () => {
    expect(
      findActivePresetKey(
        { from: { year: 2026, month: 3, day: 5 }, to: { year: 2026, month: 3, day: 15 } },
        presets,
      ),
    ).toBeNull()
  })

  it('空 preset 配列 → null', () => {
    expect(
      findActivePresetKey(
        { from: { year: 2026, month: 3, day: 1 }, to: { year: 2026, month: 3, day: 31 } },
        [],
      ),
    ).toBeNull()
  })

  it('別月範囲が preset と全く違えば null', () => {
    expect(
      findActivePresetKey(
        { from: { year: 2026, month: 4, day: 1 }, to: { year: 2026, month: 4, day: 10 } },
        presets,
      ),
    ).toBeNull()
  })
})
