/**
 * GrossProfitHeatmap — color helpers
 *
 * 検証対象:
 * - rateToColor(rate, target, warning): 3 層色判定（緑 / 黄 / 赤）
 * - deviationToColor(dev): 正負で青/赤分岐
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect } from 'vitest'
import { rateToColor, deviationToColor } from '../GrossProfitHeatmap'

describe('rateToColor', () => {
  it('rate >= target は緑系（rgba 34,197,94,...）', () => {
    const { bg } = rateToColor(0.35, 0.3, 0.25)
    expect(bg).toMatch(/rgba\(34,\s*197,\s*94/)
  })

  it('rate = target ぴったりは緑系の下限強度', () => {
    const { bg } = rateToColor(0.3, 0.3, 0.25)
    expect(bg).toMatch(/rgba\(34,\s*197,\s*94/)
  })

  it('rate が target を大きく超えると alpha が上がり text が白', () => {
    const over = rateToColor(0.4, 0.3, 0.25) // intensity=1, alpha=0.6
    expect(over.text).toBe('#fff')
  })

  it('target と target+5% の間では text は緑濃色', () => {
    const near = rateToColor(0.31, 0.3, 0.25) // intensity=0.2, alpha=0.32
    expect(near.text).toBe('#166534')
  })

  it('warning <= rate < target は黄系（rgba 234,179,8,...）', () => {
    const { bg, text } = rateToColor(0.27, 0.3, 0.25)
    expect(bg).toMatch(/rgba\(234,\s*179,\s*8/)
    expect(text).toBe('#854d0e')
  })

  it('rate < warning は赤系（rgba 239,68,68,...）', () => {
    const { bg } = rateToColor(0.2, 0.3, 0.25)
    expect(bg).toMatch(/rgba\(239,\s*68,\s*68/)
  })

  it('rate が warning を大きく下回ると alpha が上がり text が白', () => {
    const far = rateToColor(0.1, 0.3, 0.25) // (0.25-0.1)/0.05=3 → clamped 1, alpha=0.6
    expect(far.text).toBe('#fff')
  })

  it('warning 直下で text は赤濃色', () => {
    const near = rateToColor(0.24, 0.3, 0.25) // intensity=0.2, alpha=0.32
    expect(near.text).toBe('#991b1b')
  })
})

describe('deviationToColor', () => {
  it('dev=0 は青系（予算ぴったり）', () => {
    const { bg } = deviationToColor(0)
    expect(bg).toMatch(/rgba\(59,\s*130,\s*246/)
  })

  it('dev>0 は青系（予算超過＝良好）', () => {
    const { bg } = deviationToColor(0.1)
    expect(bg).toMatch(/rgba\(59,\s*130,\s*246/)
  })

  it('dev が大きく正で alpha 増加 → text 白', () => {
    const big = deviationToColor(0.2) // intensity=1 → alpha=0.6
    expect(big.text).toBe('#fff')
  })

  it('dev が小さく正で text は青濃色', () => {
    const small = deviationToColor(0.01) // intensity≈0.067 → alpha≈0.18
    expect(small.text).toBe('#1e40af')
  })

  it('dev<0 は赤系（未達）', () => {
    const { bg } = deviationToColor(-0.05)
    expect(bg).toMatch(/rgba\(239,\s*68,\s*68/)
  })

  it('dev が大きく負で alpha 増加 → text 白', () => {
    const bigNeg = deviationToColor(-0.2) // intensity=1 → alpha=0.6
    expect(bigNeg.text).toBe('#fff')
  })
})
