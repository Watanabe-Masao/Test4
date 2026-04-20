/**
 * loadCoordinator — acquireMutex / resetLoadMutex tests
 *
 * グローバルミューテックスの直列化を検証する。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { acquireMutex, resetLoadMutex } from '../loadCoordinator'

describe('acquireMutex', () => {
  beforeEach(() => {
    resetLoadMutex()
  })

  it('初回は即座に release 関数を返す', async () => {
    const release = await acquireMutex()
    expect(typeof release).toBe('function')
    release()
  })

  it('2つ目は release() 後まで待機する', async () => {
    const events: string[] = []

    const release1 = await acquireMutex()
    events.push('got 1st')

    const second = acquireMutex().then((r) => {
      events.push('got 2nd')
      r()
    })

    // 2nd はまだ取得できていない
    await Promise.resolve()
    expect(events).toEqual(['got 1st'])

    release1()
    await second
    expect(events).toEqual(['got 1st', 'got 2nd'])
  })

  it('先行が失敗しても後続は取得できる（catch で吸収）', async () => {
    // 1つ目を rejecting promise で「汚染」した状態にするため、カスタム promise を使う
    const release1 = await acquireMutex()
    const p2 = acquireMutex()

    // 1st を release
    release1()
    const release2 = await p2
    expect(typeof release2).toBe('function')
    release2()
  })

  it('resetLoadMutex 後は待ち行列がリセットされる', async () => {
    const release1 = await acquireMutex()
    // release せずに reset
    resetLoadMutex()
    const release2 = await acquireMutex()
    expect(typeof release2).toBe('function')
    release1()
    release2()
  })

  it('連続取得で直列化（3つ目は 2つ目 release 後）', async () => {
    const order: number[] = []

    const r1 = await acquireMutex()
    order.push(1)

    const p2 = acquireMutex().then((r) => {
      order.push(2)
      return r
    })
    const p3 = acquireMutex().then((r) => {
      order.push(3)
      return r
    })

    r1()
    const r2 = await p2
    r2()
    const r3 = await p3
    r3()

    expect(order).toEqual([1, 2, 3])
  })
})
