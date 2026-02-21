/**
 * Phase 7.2: DataRepository インターフェース & IndexedDBRepository テスト
 */
import { describe, it, expect } from 'vitest'
import { IndexedDBRepository } from '@/infrastructure/storage/IndexedDBRepository'

describe('IndexedDBRepository', () => {
  it('DataRepository インターフェースを実装している', () => {
    const repo = new IndexedDBRepository()

    // 全メソッドが存在することを確認
    expect(typeof repo.isAvailable).toBe('function')
    expect(typeof repo.saveMonthlyData).toBe('function')
    expect(typeof repo.loadMonthlyData).toBe('function')
    expect(typeof repo.saveDataSlice).toBe('function')
    expect(typeof repo.loadDataSlice).toBe('function')
    expect(typeof repo.getSessionMeta).toBe('function')
    expect(typeof repo.clearMonth).toBe('function')
    expect(typeof repo.clearAll).toBe('function')
    expect(typeof repo.listStoredMonths).toBe('function')
    expect(typeof repo.getDataSummary).toBe('function')
  })

  it('isAvailable が boolean を返す', () => {
    const repo = new IndexedDBRepository()
    const result = repo.isAvailable()
    expect(typeof result).toBe('boolean')
  })

  it('シングルトンインスタンスが利用可能', async () => {
    const { indexedDBRepository } = await import('@/infrastructure/storage/IndexedDBRepository')
    expect(indexedDBRepository).toBeInstanceOf(IndexedDBRepository)
  })
})
