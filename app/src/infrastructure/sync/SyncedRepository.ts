/**
 * 同期リポジトリ
 *
 * IndexedDB（プライマリ・高速読み書き）と Supabase（クラウドバックアップ）を
 * 統合し、DataRepository インターフェースを提供するオーケストレータ。
 *
 * データフロー:
 *   書き込み: App → IndexedDB (即座) → Supabase (非同期バックアップ)
 *   読み取り: IndexedDB (ローカル) → fallback → Supabase
 *
 * IndexedDB からの読み取りが空の場合、Supabase にフォールバックし、
 * 取得したデータを IndexedDB にキャッシュする。
 */
import type { DataRepository, PersistedSessionMeta, MonthDataSummaryItem } from '@/domain/repositories'
import type { ImportedData, DataType } from '@/domain/models'
import type { IndexedDBRepository } from '../storage/IndexedDBRepository'
import type { SupabaseRepository } from '../supabase/SupabaseRepository'
import { SyncService } from './SyncService'

// ─── SyncedRepository ────────────────────────────────────

export class SyncedRepository implements DataRepository {
  readonly local: IndexedDBRepository
  readonly remote: SupabaseRepository
  readonly syncService: SyncService

  constructor(
    local: IndexedDBRepository,
    remote: SupabaseRepository,
  ) {
    this.local = local
    this.remote = remote
    this.syncService = new SyncService(local, remote)
  }

  isAvailable(): boolean {
    return this.local.isAvailable()
  }

  /**
   * 書き込み: IndexedDB に保存 → Supabase に非同期バックアップ
   */
  async saveMonthlyData(data: ImportedData, year: number, month: number): Promise<void> {
    await this.local.saveMonthlyData(data, year, month)

    // Supabase へ非同期バックアップ（失敗してもローカル保存は成功）
    if (this.remote.isAvailable()) {
      console.info(`[SyncedRepository] Supabase backup starting for ${year}/${month}`)
      this.syncService.pushToRemote(year, month, data).then((result) => {
        if (result.success) {
          console.info(`[SyncedRepository] Supabase backup succeeded for ${year}/${month}`)
        } else {
          console.warn(`[SyncedRepository] Supabase backup failed for ${year}/${month}:`, result.failedTypes)
        }
      }).catch((err) => {
        console.warn('[SyncedRepository] Supabase backup failed after save:', err)
      })
    } else {
      console.info('[SyncedRepository] Supabase not available, skipping backup')
    }
  }

  /**
   * 読み取り: IndexedDB から読み、空なら Supabase にフォールバック
   */
  async loadMonthlyData(year: number, month: number): Promise<ImportedData | null> {
    const local = await this.local.loadMonthlyData(year, month)
    if (local) return local

    // ローカルに無い場合、Supabase から取得
    if (!this.remote.isAvailable()) return null

    try {
      const remote = await this.remote.loadMonthlyData(year, month)
      if (remote) {
        // 取得したデータを IndexedDB にキャッシュ
        await this.local.saveMonthlyData(remote, year, month).catch(() => { /* silent */ })
      }
      return remote
    } catch {
      return null
    }
  }

  /**
   * 部分保存: IndexedDB に保存 → 対象スライスを Supabase に非同期バックアップ
   */
  async saveDataSlice(
    data: ImportedData,
    year: number,
    month: number,
    dataTypes: readonly DataType[],
  ): Promise<void> {
    await this.local.saveDataSlice(data, year, month, dataTypes)

    // Supabase へ非同期バックアップ
    if (this.remote.isAvailable()) {
      console.info(`[SyncedRepository] Supabase slice backup starting for ${year}/${month}`, dataTypes)
      this.syncService.pushSlicesToRemote(year, month, data, dataTypes).then((result) => {
        if (result.success) {
          console.info(`[SyncedRepository] Supabase slice backup succeeded for ${year}/${month}`)
        } else {
          console.warn(`[SyncedRepository] Supabase slice backup failed for ${year}/${month}:`, result.failedTypes)
        }
      }).catch((err) => {
        console.warn('[SyncedRepository] Supabase backup failed after saveDataSlice:', err)
      })
    }
  }

  /**
   * スライス読み取り: IndexedDB → Supabase フォールバック
   */
  async loadDataSlice<T>(year: number, month: number, dataType: string): Promise<T | null> {
    const local = await this.local.loadDataSlice<T>(year, month, dataType)
    if (local !== null) return local

    if (!this.remote.isAvailable()) return null

    try {
      return await this.remote.loadDataSlice<T>(year, month, dataType)
    } catch {
      return null
    }
  }

  async getSessionMeta(): Promise<PersistedSessionMeta | null> {
    const local = await this.local.getSessionMeta()
    if (local) return local

    if (!this.remote.isAvailable()) return null

    try {
      return await this.remote.getSessionMeta()
    } catch {
      return null
    }
  }

  async clearMonth(year: number, month: number): Promise<void> {
    await this.local.clearMonth(year, month)

    if (this.remote.isAvailable()) {
      this.remote.clearMonth(year, month).catch(() => { /* silent */ })
    }
  }

  async clearAll(): Promise<void> {
    await this.local.clearAll()

    if (this.remote.isAvailable()) {
      this.remote.clearAll().catch(() => { /* silent */ })
    }
  }

  async listStoredMonths(): Promise<{ year: number; month: number }[]> {
    return this.local.listStoredMonths()
  }

  async getDataSummary(year: number, month: number): Promise<MonthDataSummaryItem[]> {
    return this.local.getDataSummary(year, month)
  }

  /**
   * SyncService インスタンスを公開する（テスト・管理画面向け）
   */
  getSyncService(): SyncService {
    return this.syncService
  }
}
