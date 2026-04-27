/**
 * widgetPeriodStore.ts — resolveWidgetPeriod2 + zustand store actions
 *
 * 検証対象:
 * - resolveWidgetPeriod2: override 無 / linked=true / linked=false + customPeriod2 有
 * - toggleLink: linked=true でリンク復帰 (override 削除), linked=false で override 作成
 * - setCustomPeriod2: linked=false + customPeriod2 を設定
 * - resetOverride: 特定 widgetId のオーバーライド削除
 * - resetAll: 全オーバーライドクリア
 *
 * @taxonomyKind T:state-transition
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { resolveWidgetPeriod2, useWidgetPeriodStore } from '../widgetPeriodStore'
import type { DateRange } from '@/domain/models/CalendarDate'

const globalP2: DateRange = {
  from: { year: 2025, month: 4, day: 1 },
  to: { year: 2025, month: 4, day: 30 },
}

const customP2: DateRange = {
  from: { year: 2024, month: 4, day: 1 },
  to: { year: 2024, month: 4, day: 30 },
}

// ─── resolveWidgetPeriod2 ─────────────────────

describe('resolveWidgetPeriod2', () => {
  it('override 無 → global period2 / isLinked=true', () => {
    const result = resolveWidgetPeriod2('w1', new Map(), globalP2)
    expect(result.period2).toBe(globalP2)
    expect(result.isLinked).toBe(true)
  })

  it('linked=true → global period2', () => {
    const overrides = new Map([['w1', { linked: true, customPeriod2: customP2 }]])
    const result = resolveWidgetPeriod2('w1', overrides, globalP2)
    expect(result.period2).toBe(globalP2)
    expect(result.isLinked).toBe(true)
  })

  it('linked=false + customPeriod2=null → global period2 (fallback)', () => {
    const overrides = new Map([['w1', { linked: false, customPeriod2: null }]])
    const result = resolveWidgetPeriod2('w1', overrides, globalP2)
    expect(result.period2).toBe(globalP2)
    expect(result.isLinked).toBe(true)
  })

  it('linked=false + customPeriod2 有 → custom period2 / isLinked=false', () => {
    const overrides = new Map([['w1', { linked: false, customPeriod2: customP2 }]])
    const result = resolveWidgetPeriod2('w1', overrides, globalP2)
    expect(result.period2).toBe(customP2)
    expect(result.isLinked).toBe(false)
  })

  it('他 widget の override に影響を受けない', () => {
    const overrides = new Map([['w2', { linked: false, customPeriod2: customP2 }]])
    const result = resolveWidgetPeriod2('w1', overrides, globalP2)
    expect(result.period2).toBe(globalP2)
    expect(result.isLinked).toBe(true)
  })
})

// ─── store actions ─────────────────────────────

describe('widgetPeriodStore actions', () => {
  beforeEach(() => {
    useWidgetPeriodStore.getState().resetAll()
  })

  it('初期状態は 空 Map', () => {
    expect(useWidgetPeriodStore.getState().overrides.size).toBe(0)
  })

  it('toggleLink(linked=false): override を作成', () => {
    useWidgetPeriodStore.getState().toggleLink('w1', false)
    const state = useWidgetPeriodStore.getState()
    expect(state.overrides.get('w1')).toEqual({ linked: false, customPeriod2: null })
  })

  it('toggleLink(linked=true): override を削除', () => {
    useWidgetPeriodStore.getState().toggleLink('w1', false)
    useWidgetPeriodStore.getState().toggleLink('w1', true)
    expect(useWidgetPeriodStore.getState().overrides.has('w1')).toBe(false)
  })

  it('toggleLink(linked=false) 2 回目: 既存 customPeriod2 を維持', () => {
    useWidgetPeriodStore.getState().setCustomPeriod2('w1', customP2)
    useWidgetPeriodStore.getState().toggleLink('w1', false)
    const override = useWidgetPeriodStore.getState().overrides.get('w1')
    expect(override?.customPeriod2).toBe(customP2)
  })

  it('setCustomPeriod2: linked=false + customPeriod2 を設定', () => {
    useWidgetPeriodStore.getState().setCustomPeriod2('w1', customP2)
    const override = useWidgetPeriodStore.getState().overrides.get('w1')
    expect(override?.linked).toBe(false)
    expect(override?.customPeriod2).toBe(customP2)
  })

  it('resetOverride: 特定 widgetId の override を削除', () => {
    useWidgetPeriodStore.getState().setCustomPeriod2('w1', customP2)
    useWidgetPeriodStore.getState().setCustomPeriod2('w2', customP2)
    useWidgetPeriodStore.getState().resetOverride('w1')
    const state = useWidgetPeriodStore.getState()
    expect(state.overrides.has('w1')).toBe(false)
    expect(state.overrides.has('w2')).toBe(true)
  })

  it('resetAll: 全 override を削除', () => {
    useWidgetPeriodStore.getState().setCustomPeriod2('w1', customP2)
    useWidgetPeriodStore.getState().setCustomPeriod2('w2', customP2)
    useWidgetPeriodStore.getState().resetAll()
    expect(useWidgetPeriodStore.getState().overrides.size).toBe(0)
  })

  it('resolveWidgetPeriod2 with store state', () => {
    useWidgetPeriodStore.getState().setCustomPeriod2('w1', customP2)
    const overrides = useWidgetPeriodStore.getState().overrides
    const result = resolveWidgetPeriod2('w1', overrides, globalP2)
    expect(result.period2).toBe(customP2)
  })
})
