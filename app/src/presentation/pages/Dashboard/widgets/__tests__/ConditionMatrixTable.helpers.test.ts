/**
 * ConditionMatrixTable.helpers — display formatter tests
 *
 * 検証対象:
 * - ratioColor: 1.02 / 0.98 境界の 3 状態（positive / neutral / negative）
 * - formatRatio: null → '-'、値あり → %
 * - directionArrow: up/down/neutral → 矢印
 */
import { describe, it, expect } from 'vitest'
import { ratioColor, formatRatio, directionArrow } from '../ConditionMatrixTable.helpers'
import { palette } from '@/presentation/theme/tokens'
import type { MatrixCell, TrendDirection } from '@/application/queries/advanced'

describe('ratioColor', () => {
  it('null は undefined（未判定）', () => {
    expect(ratioColor(null)).toBeUndefined()
  })

  it('1.02 以上は positive', () => {
    expect(ratioColor(1.02)).toBe(palette.positive)
    expect(ratioColor(1.5)).toBe(palette.positive)
    expect(ratioColor(2.0)).toBe(palette.positive)
  })

  it('0.98〜1.02 未満は undefined（中立帯）', () => {
    expect(ratioColor(0.98)).toBeUndefined()
    expect(ratioColor(1.0)).toBeUndefined()
    expect(ratioColor(1.0199)).toBeUndefined()
  })

  it('0.98 未満は negative', () => {
    expect(ratioColor(0.9799)).toBe(palette.negative)
    expect(ratioColor(0.5)).toBe(palette.negative)
    expect(ratioColor(0)).toBe(palette.negative)
  })

  it('負の値も negative', () => {
    expect(ratioColor(-0.1)).toBe(palette.negative)
  })
})

describe('formatRatio', () => {
  function cell(ratio: number | null): MatrixCell {
    return { ratio } as MatrixCell
  }

  it('ratio=null は "-"', () => {
    expect(formatRatio(cell(null))).toBe('-')
  })

  it('ratio=1.0 は 100.00%', () => {
    expect(formatRatio(cell(1.0))).toContain('%')
    expect(formatRatio(cell(1.0))).toMatch(/100/)
  })

  it('ratio=0.95 は 95 近辺の % 表示', () => {
    expect(formatRatio(cell(0.95))).toMatch(/95/)
  })

  it('ratio=0 は 0.00%', () => {
    expect(formatRatio(cell(0))).toMatch(/0/)
    expect(formatRatio(cell(0))).toContain('%')
  })

  it('負の ratio も %', () => {
    expect(formatRatio(cell(-0.1))).toContain('%')
  })
})

describe('directionArrow', () => {
  it('up → ↑', () => {
    expect(directionArrow('up' as TrendDirection)).toBe('↑')
  })

  it('down → ↓', () => {
    expect(directionArrow('down' as TrendDirection)).toBe('↓')
  })

  it('neutral（その他）→ →', () => {
    expect(directionArrow('neutral' as TrendDirection)).toBe('→')
  })
})
