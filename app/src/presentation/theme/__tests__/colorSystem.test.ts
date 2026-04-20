/**
 * colorSystem — statusAlpha tests
 */
import { describe, it, expect } from 'vitest'
import { statusAlpha } from '../colorSystem'

describe('statusAlpha', () => {
  it('positive は緑系 RGB', () => {
    expect(statusAlpha('positive', 0.3)).toBe('rgba(34,197,94,0.3)')
  })

  it('negative は赤系 RGB', () => {
    expect(statusAlpha('negative', 0.5)).toBe('rgba(239,68,68,0.5)')
  })

  it('info は青系 RGB', () => {
    expect(statusAlpha('info', 0.2)).toBe('rgba(59,130,246,0.2)')
  })

  it('muted はグレー系 RGB', () => {
    expect(statusAlpha('muted', 0.1)).toBe('rgba(156,163,175,0.1)')
  })

  it('alpha=0 なら完全透明', () => {
    expect(statusAlpha('positive', 0)).toBe('rgba(34,197,94,0)')
  })

  it('alpha=1 なら不透明', () => {
    expect(statusAlpha('positive', 1)).toBe('rgba(34,197,94,1)')
  })

  it('rgba() 形式を返す（ECharts 互換）', () => {
    const r = statusAlpha('positive', 0.5)
    expect(r).toMatch(/^rgba\(\d+,\d+,\d+,[\d.]+\)$/)
  })
})
