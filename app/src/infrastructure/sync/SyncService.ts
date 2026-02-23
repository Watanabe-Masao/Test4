/**
 * IndexedDB → Supabase 同期サービス
 *
 * ローカル（IndexedDB）に保存されたデータを
 * リモート（Supabase）へ非同期にバックアップする。
 *
 * 同期戦略:
 * 1. 書き込み後同期: saveMonthlyData / saveDataSlice 後に呼ばれる
 * 2. 全量プッシュ: ローカルの全データをリモートに反映
 * 3. ログ記録: 同期結果を Supabase の sync_log テーブルに記録
 */
import type { ImportedData, DataType } from '@/domain/models'
import type { IndexedDBRepository } from '../storage/IndexedDBRepository'
import type { SupabaseRepository } from '../supabase/SupabaseRepository'

/** 同期結果 */
export interface SyncResult {
  readonly success: boolean
  readonly syncedTypes: readonly string[]
  readonly failedTypes: readonly { dataType: string; error: string }[]
}

export class SyncService {
  readonly local: IndexedDBRepository
  readonly remote: SupabaseRepository

  constructor(local: IndexedDBRepository, remote: SupabaseRepository) {
    this.local = local
    this.remote = remote
  }

  /**
   * ローカルデータを Supabase にプッシュする（全量）。
   * 書き込み直後に呼ばれるため、data を直接受け取る。
   */
  async pushToRemote(
    year: number,
    month: number,
    data: ImportedData,
  ): Promise<SyncResult> {
    try {
      await this.remote.saveMonthlyData(data, year, month)
      await this.logSync(year, month, '*', 'success')
      return { success: true, syncedTypes: ['*'], failedTypes: [] }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      await this.logSync(year, month, '*', 'failed', message)
      return {
        success: false,
        syncedTypes: [],
        failedTypes: [{ dataType: '*', error: message }],
      }
    }
  }

  /**
   * 指定データ種別のみを Supabase にプッシュする。
   * 部分インポート後に使用。
   */
  async pushSlicesToRemote(
    year: number,
    month: number,
    data: ImportedData,
    dataTypes: readonly DataType[],
  ): Promise<SyncResult> {
    try {
      await this.remote.saveDataSlice(data, year, month, dataTypes)
      const syncedTypes = [...dataTypes]
      for (const dt of syncedTypes) {
        await this.logSync(year, month, dt, 'success')
      }
      return { success: true, syncedTypes, failedTypes: [] }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      const failedTypes = dataTypes.map((dt) => ({ dataType: dt, error: message }))
      for (const dt of dataTypes) {
        await this.logSync(year, month, dt, 'failed', message)
      }
      return { success: false, syncedTypes: [], failedTypes }
    }
  }

  /**
   * ローカルにあるデータを Supabase にプッシュする（データ引数なし）。
   * リモートとの再同期が必要な場合に使用。
   */
  async syncFromLocal(year: number, month: number): Promise<SyncResult> {
    try {
      const data = await this.local.loadMonthlyData(year, month)
      if (!data) {
        return { success: true, syncedTypes: [], failedTypes: [] }
      }
      return this.pushToRemote(year, month, data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return {
        success: false,
        syncedTypes: [],
        failedTypes: [{ dataType: '*', error: message }],
      }
    }
  }

  protected async logSync(
    year: number,
    month: number,
    dataType: string,
    status: 'success' | 'failed',
    errorMessage?: string,
  ): Promise<void> {
    try {
      await this.remote.writeSyncLog(year, month, dataType, status, errorMessage)
    } catch {
      // ログ記録失敗はサイレントに無視
    }
  }
}
