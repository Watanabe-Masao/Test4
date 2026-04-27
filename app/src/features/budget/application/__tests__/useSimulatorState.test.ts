/**
 * useSimulatorState テスト
 *
 * state 初期値・setter 動作・localStorage 永続化・currentDay clamp を検証する。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useSimulatorState, STORAGE_KEY_DAY, STORAGE_KEY_WEEKSTART } from '../useSimulatorState'

describe('useSimulatorState', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('初期状態: 引数の initialCurrentDay / デフォルト値を返す', () => {
    const { result } = renderHook(() => useSimulatorState(15, 30))
    expect(result.current.currentDay).toBe(15)
    expect(result.current.mode).toBe('yoy')
    expect(result.current.yoyInput).toBe(100)
    expect(result.current.achInput).toBe(100)
    expect(result.current.dowInputs).toEqual([100, 100, 100, 100, 100, 100, 100])
    expect(result.current.dowBase).toBe('yoy')
    expect(result.current.dayOverrides).toEqual({})
    expect(result.current.weekStart).toBe(1)
  })

  it('initialCurrentDay が daysInMonth を超える → clamp される', () => {
    const { result } = renderHook(() => useSimulatorState(99, 30))
    expect(result.current.currentDay).toBe(30)
  })

  it('initialCurrentDay が 0 以下 → 1 に clamp', () => {
    const { result } = renderHook(() => useSimulatorState(0, 30))
    expect(result.current.currentDay).toBe(1)
  })

  it('setCurrentDay 呼出で値更新 + localStorage に永続化', () => {
    const { result } = renderHook(() => useSimulatorState(10, 30))
    act(() => result.current.setCurrentDay(20))
    expect(result.current.currentDay).toBe(20)
    expect(localStorage.getItem(STORAGE_KEY_DAY)).toBe('20')
  })

  it('setCurrentDay: 範囲外は clamp', () => {
    const { result } = renderHook(() => useSimulatorState(10, 30))
    act(() => result.current.setCurrentDay(50))
    expect(result.current.currentDay).toBe(30)
    act(() => result.current.setCurrentDay(-5))
    expect(result.current.currentDay).toBe(1)
  })

  it('localStorage に保存値あり → 初期状態でそれを採用', () => {
    localStorage.setItem(STORAGE_KEY_DAY, '22')
    const { result } = renderHook(() => useSimulatorState(10, 30))
    expect(result.current.currentDay).toBe(22)
  })

  it('localStorage 保存値が daysInMonth 超過 → clamp', () => {
    localStorage.setItem(STORAGE_KEY_DAY, '100')
    const { result } = renderHook(() => useSimulatorState(10, 30))
    expect(result.current.currentDay).toBe(30)
  })

  it('localStorage 保存値が非数値 → initialCurrentDay を使う', () => {
    localStorage.setItem(STORAGE_KEY_DAY, 'invalid')
    const { result } = renderHook(() => useSimulatorState(15, 30))
    expect(result.current.currentDay).toBe(15)
  })

  it('weekStart: 初期値 1 (月曜始まり)、localStorage 永続化', () => {
    const { result } = renderHook(() => useSimulatorState(10, 30))
    expect(result.current.weekStart).toBe(1)
    act(() => result.current.setWeekStart(0))
    expect(result.current.weekStart).toBe(0)
    expect(localStorage.getItem(STORAGE_KEY_WEEKSTART)).toBe('0')
  })

  it('localStorage に weekStart 保存値あり', () => {
    localStorage.setItem(STORAGE_KEY_WEEKSTART, '0')
    const { result } = renderHook(() => useSimulatorState(10, 30))
    expect(result.current.weekStart).toBe(0)
  })

  it('localStorage の weekStart が 0/1 以外 → デフォルト 1', () => {
    localStorage.setItem(STORAGE_KEY_WEEKSTART, '5')
    const { result } = renderHook(() => useSimulatorState(10, 30))
    expect(result.current.weekStart).toBe(1)
  })

  it('setMode / setYoyInput / setAchInput / setDowBase は値を更新する', () => {
    const { result } = renderHook(() => useSimulatorState(10, 30))
    act(() => result.current.setMode('dow'))
    expect(result.current.mode).toBe('dow')
    act(() => result.current.setYoyInput(110))
    expect(result.current.yoyInput).toBe(110)
    act(() => result.current.setAchInput(95))
    expect(result.current.achInput).toBe(95)
    act(() => result.current.setDowBase('ach'))
    expect(result.current.dowBase).toBe('ach')
  })

  it('setDowInputs で 7-tuple 更新', () => {
    const { result } = renderHook(() => useSimulatorState(10, 30))
    act(() => result.current.setDowInputs([50, 60, 70, 80, 90, 100, 110]))
    expect(result.current.dowInputs).toEqual([50, 60, 70, 80, 90, 100, 110])
  })

  it('setDayOverride で特定日の値設定', () => {
    const { result } = renderHook(() => useSimulatorState(10, 30))
    act(() => result.current.setDayOverride(15, 200))
    expect(result.current.dayOverrides).toEqual({ 15: 200 })

    act(() => result.current.setDayOverride(20, 150))
    expect(result.current.dayOverrides).toEqual({ 15: 200, 20: 150 })
  })

  it('clearDayOverride で特定日の値削除', () => {
    const { result } = renderHook(() => useSimulatorState(10, 30))
    act(() => result.current.setDayOverride(15, 200))
    act(() => result.current.setDayOverride(20, 150))
    act(() => result.current.clearDayOverride(15))
    expect(result.current.dayOverrides).toEqual({ 20: 150 })
  })

  it('clearDayOverride 存在しない day → 変更なし', () => {
    const { result } = renderHook(() => useSimulatorState(10, 30))
    act(() => result.current.setDayOverride(15, 200))
    const before = result.current.dayOverrides
    act(() => result.current.clearDayOverride(99))
    expect(result.current.dayOverrides).toBe(before) // 参照不変
  })

  it('resetDayOverrides で全削除', () => {
    const { result } = renderHook(() => useSimulatorState(10, 30))
    act(() => result.current.setDayOverride(15, 200))
    act(() => result.current.setDayOverride(20, 150))
    act(() => result.current.resetDayOverrides())
    expect(result.current.dayOverrides).toEqual({})
  })

  it('daysInMonth の変更で currentDay を再 clamp', () => {
    const { result, rerender } = renderHook(
      ({ initial, dim }: { initial: number; dim: number }) => useSimulatorState(initial, dim),
      { initialProps: { initial: 28, dim: 31 } },
    )
    expect(result.current.currentDay).toBe(28)

    // daysInMonth が 20 に縮小 → currentDay も 20 に clamp されるべき
    rerender({ initial: 28, dim: 20 })
    expect(result.current.currentDay).toBe(20)
  })
})
