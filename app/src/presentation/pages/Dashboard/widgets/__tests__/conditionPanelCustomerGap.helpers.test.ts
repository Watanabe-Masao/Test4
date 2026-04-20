/**
 * conditionPanelCustomerGap — display helpers
 *
 * 検証対象:
 * - gapColor: 非負 → 緑 / 負 → 赤
 * - fmtGap: sign 付き % 表示（小数第1位）
 */
import { describe, it, expect } from 'vitest'
import { gapColor, fmtGap } from '../conditionPanelCustomerGap'

describe('gapColor', () => {
  it('正の値は緑（#10b981）', () => {
    expect(gapColor(0.05)).toBe('#10b981')
    expect(gapColor(1)).toBe('#10b981')
  })

  it('0 ちょうども緑', () => {
    expect(gapColor(0)).toBe('#10b981')
  })

  it('負の値は赤（#ef4444）', () => {
    expect(gapColor(-0.01)).toBe('#ef4444')
    expect(gapColor(-1)).toBe('#ef4444')
  })
})

describe('fmtGap', () => {
  it('正の値は + sign 付き', () => {
    expect(fmtGap(0.03)).toMatch(/^\+/)
    expect(fmtGap(0.03)).toContain('%')
  })

  it('0 は +0.0% 扱い', () => {
    expect(fmtGap(0)).toMatch(/^\+/)
    expect(fmtGap(0)).toContain('0')
  })

  it('負の値は sign なし（formatPercent が - 付ける）', () => {
    expect(fmtGap(-0.05)).not.toMatch(/^\+/)
    expect(fmtGap(-0.05)).toContain('-')
    expect(fmtGap(-0.05)).toContain('%')
  })

  it('小数第2位以降は丸め', () => {
    expect(fmtGap(0.1234)).toMatch(/12.3/) // 1 桁精度
  })
})
