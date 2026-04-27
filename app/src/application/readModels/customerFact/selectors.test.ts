/**
 * selectors.test.ts — customerFact selector の pure function 検証
 *
 * SP-B ADR-B-003 PR2 で新設。
 *
 * @responsibility R:test
 *
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect } from 'vitest'
import {
  selectTotalCustomers,
  selectCustomerCountOrUndefined,
  selectStoreCustomerMap,
} from './selectors'
import type { CustomerFactReadModel } from './CustomerFactTypes'
import type { ReadModelSlice } from '@/application/hooks/useWidgetDataOrchestrator'

const sampleData: CustomerFactReadModel = {
  grandTotalCustomers: 12345,
  daily: [],
  meta: { usedFallback: false, missingPolicy: 'zero', dataVersion: 1 },
}

describe('selectTotalCustomers', () => {
  it('ready 状態では slice.data.grandTotalCustomers を返す', () => {
    const slice: ReadModelSlice<CustomerFactReadModel> = { status: 'ready', data: sampleData }
    expect(selectTotalCustomers(slice, 999)).toBe(12345)
  })

  it('idle 状態では fallback を返す', () => {
    const slice: ReadModelSlice<CustomerFactReadModel> = { status: 'idle' }
    expect(selectTotalCustomers(slice, 999)).toBe(999)
  })

  it('loading 状態では fallback を返す', () => {
    const slice: ReadModelSlice<CustomerFactReadModel> = { status: 'loading' }
    expect(selectTotalCustomers(slice, 555)).toBe(555)
  })

  it('error 状態では fallback を返す', () => {
    const slice: ReadModelSlice<CustomerFactReadModel> = {
      status: 'error',
      error: new Error('test'),
    }
    expect(selectTotalCustomers(slice, 0)).toBe(0)
  })

  it('slice 自体が undefined でも fallback を返す（optional chaining 安全性）', () => {
    expect(selectTotalCustomers(undefined, 777)).toBe(777)
  })
})

describe('selectCustomerCountOrUndefined', () => {
  it('ready 状態では slice.data.grandTotalCustomers を返す', () => {
    const slice: ReadModelSlice<CustomerFactReadModel> = { status: 'ready', data: sampleData }
    expect(selectCustomerCountOrUndefined(slice)).toBe(12345)
  })

  it('ready でない状態では undefined を返す（fallback なし）', () => {
    expect(selectCustomerCountOrUndefined({ status: 'idle' })).toBeUndefined()
    expect(selectCustomerCountOrUndefined({ status: 'loading' })).toBeUndefined()
    expect(
      selectCustomerCountOrUndefined({ status: 'error', error: new Error('test') }),
    ).toBeUndefined()
    expect(selectCustomerCountOrUndefined(undefined)).toBeUndefined()
  })
})

describe('selectStoreCustomerMap', () => {
  it('ready 状態では toStoreCustomerRows の結果（ReadonlyMap）を返す', () => {
    const slice: ReadModelSlice<CustomerFactReadModel> = { status: 'ready', data: sampleData }
    const result = selectStoreCustomerMap(slice)
    expect(result).toBeDefined()
    expect(result).toBeInstanceOf(Map)
  })

  it('ready でない状態では undefined を返す', () => {
    expect(selectStoreCustomerMap({ status: 'idle' })).toBeUndefined()
    expect(selectStoreCustomerMap(undefined)).toBeUndefined()
  })
})
