/**
 * @taxonomyKind T:unclassified
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from '../uiStore'

describe('uiStore', () => {
  beforeEach(() => {
    useUiStore.getState().resetTransientState()
  })

  it('初期状態のデフォルト値', () => {
    const state = useUiStore.getState()
    expect(state.selectedStoreIds.size).toBe(0)
    expect(state.isCalculated).toBe(false)
    expect(state.isImporting).toBe(false)
  })

  it('toggleStore で店舗の選択/解除が切り替わる', () => {
    useUiStore.getState().toggleStore('s1')
    expect(useUiStore.getState().selectedStoreIds.has('s1')).toBe(true)

    useUiStore.getState().toggleStore('s1')
    expect(useUiStore.getState().selectedStoreIds.has('s1')).toBe(false)
  })

  it('toggleStore で複数店舗を選択できる', () => {
    useUiStore.getState().toggleStore('s1')
    useUiStore.getState().toggleStore('s2')

    const ids = useUiStore.getState().selectedStoreIds
    expect(ids.size).toBe(2)
    expect(ids.has('s1')).toBe(true)
    expect(ids.has('s2')).toBe(true)
  })

  it('selectAllStores で選択がクリアされる', () => {
    useUiStore.getState().toggleStore('s1')
    useUiStore.getState().toggleStore('s2')
    expect(useUiStore.getState().selectedStoreIds.size).toBe(2)

    useUiStore.getState().selectAllStores()
    expect(useUiStore.getState().selectedStoreIds.size).toBe(0)
  })

  it('setImporting でインポート中フラグを制御できる', () => {
    useUiStore.getState().setImporting(true)
    expect(useUiStore.getState().isImporting).toBe(true)

    useUiStore.getState().setImporting(false)
    expect(useUiStore.getState().isImporting).toBe(false)
  })

  it('setCalculated で計算済みフラグを制御できる', () => {
    useUiStore.getState().setCalculated(true)
    expect(useUiStore.getState().isCalculated).toBe(true)
  })

  it('invalidateCalculation で計算を無効化できる', () => {
    useUiStore.getState().setCalculated(true)
    expect(useUiStore.getState().isCalculated).toBe(true)

    useUiStore.getState().invalidateCalculation()
    expect(useUiStore.getState().isCalculated).toBe(false)
  })

  it('resetTransientState で一時状態がリセットされる', () => {
    useUiStore.getState().toggleStore('s1')
    useUiStore.getState().setImporting(true)
    useUiStore.getState().setCalculated(true)

    useUiStore.getState().resetTransientState()

    const state = useUiStore.getState()
    expect(state.selectedStoreIds.size).toBe(0)
    expect(state.isImporting).toBe(false)
    expect(state.isCalculated).toBe(false)
  })
})
