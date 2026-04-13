/**
 * grid.ts — grid preset builder tests
 */
import { describe, it, expect } from 'vitest'
import { gridPresets, standardGrid } from '../grid'

describe('gridPresets', () => {
  it('exposes standard preset with containLabel', () => {
    expect(gridPresets.standard).toEqual({
      left: 10,
      right: 20,
      top: 30,
      bottom: 20,
      containLabel: true,
    })
  })

  it('exposes compact preset with smaller margins', () => {
    expect(gridPresets.compact.left).toBe(5)
    expect(gridPresets.compact.right).toBe(10)
    expect(gridPresets.compact.top).toBe(20)
    expect(gridPresets.compact.bottom).toBe(14)
    expect(gridPresets.compact.containLabel).toBe(true)
  })

  it('exposes horizontalBar preset', () => {
    expect(gridPresets.horizontalBar.containLabel).toBe(true)
    expect(gridPresets.horizontalBar.top).toBe(10)
  })

  it('exposes heatmap preset with containLabel disabled', () => {
    expect(gridPresets.heatmap.containLabel).toBe(false)
    expect(gridPresets.heatmap.left).toBe(50)
  })
})

describe('standardGrid', () => {
  it('returns a copy of standard preset', () => {
    const grid = standardGrid()
    expect(grid).toEqual(gridPresets.standard)
  })

  it('returns a new object each call (mutation safety)', () => {
    const a = standardGrid()
    const b = standardGrid()
    expect(a).not.toBe(b)
    expect(a).toEqual(b)
  })

  it('allows overriding via spread without affecting the preset', () => {
    const custom = { ...standardGrid(), top: 99 }
    expect(custom.top).toBe(99)
    expect(gridPresets.standard.top).toBe(30)
  })
})
