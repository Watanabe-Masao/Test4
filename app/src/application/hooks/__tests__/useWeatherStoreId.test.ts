/**
 * useWeatherStoreId の挙動テスト
 *
 * 主要な契約:
 * - 選択中の店舗のうち storeLocations に登録された最初の店舗を返す
 * - 該当が無ければ空文字列を返す（useWeatherData の早期 return 契約と整合）
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useWeatherStoreId } from '../useWeatherStoreId'
import { useSettingsStore } from '@/application/stores/settingsStore'
import type { StoreLocation } from '@/domain/models/WeatherData'

const LOC: StoreLocation = {
  latitude: 35.68,
  longitude: 139.76,
}

describe('useWeatherStoreId', () => {
  beforeEach(() => {
    useSettingsStore.setState((s) => ({
      ...s,
      settings: { ...s.settings, storeLocations: {} },
    }))
  })

  it('selected の中で location を持つ店舗を返す', () => {
    useSettingsStore.setState((s) => ({
      ...s,
      settings: { ...s.settings, storeLocations: { s2: LOC } },
    }))
    const stores = new Map<string, unknown>([
      ['s1', {}],
      ['s2', {}],
    ])
    const selected = new Set(['s1', 's2'])
    const { result } = renderHook(() => useWeatherStoreId(selected, stores))
    expect(result.current).toBe('s2')
  })

  it('selected が空なら全店舗から location を持つ最初の店舗を返す', () => {
    useSettingsStore.setState((s) => ({
      ...s,
      settings: { ...s.settings, storeLocations: { s3: LOC } },
    }))
    const stores = new Map<string, unknown>([
      ['s1', {}],
      ['s2', {}],
      ['s3', {}],
    ])
    const { result } = renderHook(() => useWeatherStoreId(new Set(), stores))
    expect(result.current).toBe('s3')
  })

  it('どの店舗も location を持たない場合は空文字列を返す（fallback せず）', () => {
    // @defense useWeatherData は !location で早期 return するため、
    //   location を持たない storeId を返すと fetch 不能なまま weatherDaily=[] となり、
    //   UI 側で気温 toggle が無反応になる。空文字列を返して呼び出し側で明示ガードする。
    const stores = new Map<string, unknown>([
      ['s1', {}],
      ['s2', {}],
    ])
    const { result } = renderHook(() => useWeatherStoreId(new Set(['s1', 's2']), stores))
    expect(result.current).toBe('')
  })
})
