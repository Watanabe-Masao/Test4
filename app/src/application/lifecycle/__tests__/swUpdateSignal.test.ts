/**
 * swUpdateSignal のテスト
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  notifySwUpdate,
  subscribeSwUpdate,
  getSwUpdateSnapshot,
  resetSwUpdateSignal,
} from '../swUpdateSignal'

beforeEach(() => {
  resetSwUpdateSignal()
})

describe('swUpdateSignal', () => {
  it('initial snapshot is false', () => {
    expect(getSwUpdateSnapshot()).toBe(false)
  })

  it('notifySwUpdate sets snapshot to true', () => {
    notifySwUpdate()
    expect(getSwUpdateSnapshot()).toBe(true)
  })

  it('listeners are notified on notifySwUpdate', () => {
    const listener = vi.fn()
    subscribeSwUpdate(listener)
    notifySwUpdate()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('unsubscribe removes listener', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeSwUpdate(listener)
    unsubscribe()
    notifySwUpdate()
    expect(listener).not.toHaveBeenCalled()
  })

  it('multiple listeners are all notified', () => {
    const listener1 = vi.fn()
    const listener2 = vi.fn()
    subscribeSwUpdate(listener1)
    subscribeSwUpdate(listener2)
    notifySwUpdate()
    expect(listener1).toHaveBeenCalledTimes(1)
    expect(listener2).toHaveBeenCalledTimes(1)
  })
})
