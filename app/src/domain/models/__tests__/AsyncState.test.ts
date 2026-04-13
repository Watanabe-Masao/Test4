/**
 * AsyncState の isUsable 型ガードテスト
 *
 * success / stale / partial でデータが利用可能、他は利用不可と判定されることを検証する。
 */
import { describe, it, expect } from 'vitest'
import { isUsable, type AsyncState } from '@/domain/models/AsyncState'

const make = <T>(status: AsyncState<T>['status'], data: T | null): AsyncState<T> => ({
  status,
  data,
  error: null,
})

describe('isUsable', () => {
  it('status=success + data≠null のとき true', () => {
    expect(isUsable(make('success', { value: 1 }))).toBe(true)
  })

  it('status=stale + data≠null のとき true', () => {
    expect(isUsable(make('stale', 'some-value'))).toBe(true)
  })

  it('status=partial + data≠null のとき true', () => {
    expect(isUsable(make('partial', [1, 2, 3]))).toBe(true)
  })

  it('status=success でも data=null なら false', () => {
    expect(isUsable(make<string>('success', null))).toBe(false)
  })

  it('status=idle は false（data 有無にかかわらず）', () => {
    expect(isUsable(make('idle', { x: 1 }))).toBe(false)
    expect(isUsable(make<number>('idle', null))).toBe(false)
  })

  it('status=loading は false', () => {
    expect(isUsable(make('loading', { x: 1 }))).toBe(false)
  })

  it('status=retryable-error は false', () => {
    expect(isUsable(make('retryable-error', { x: 1 }))).toBe(false)
  })

  it('status=fatal-error は false', () => {
    expect(isUsable(make('fatal-error', { x: 1 }))).toBe(false)
  })

  it('data=0 でも usable と判定する（!= null ガード）', () => {
    // 0 は falsy だが null ではないので isUsable は true
    expect(isUsable(make<number>('success', 0))).toBe(true)
  })

  it('data=false でも usable と判定する', () => {
    expect(isUsable(make<boolean>('success', false))).toBe(true)
  })
})
