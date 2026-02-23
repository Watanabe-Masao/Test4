/**
 * Supabase → Firestore 同期サービス
 *
 * Supabase（マスター DB）に書き込まれたデータを
 * Firestore（読み取りキャッシュ）へ伝播する。
 *
 * 同期戦略:
 * 1. 書き込み後同期: saveMonthlyData / saveDataSlice 後に呼ばれる
 * 2. 全量同期: 初回ロード or 不整合検出時に全スライスを再同期
 * 3. ログ記録: 同期結果を Supabase の sync_log テーブルに記録
 */
import type { SupabaseRepository } from '../supabase/SupabaseRepository'
import type { FirestoreReadCache } from '../firebase/FirestoreReadCache'

/** 同期結果 */
export interface SyncResult {
  readonly success: boolean
  readonly syncedTypes: readonly string[]
  readonly failedTypes: readonly { dataType: string; error: string }[]
}

export class SyncService {
  readonly supabase: SupabaseRepository
  readonly firestore: FirestoreReadCache

  constructor(supabase: SupabaseRepository, firestore: FirestoreReadCache) {
    this.supabase = supabase
    this.firestore = firestore
  }

  /**
   * 指定年月の全データを Supabase → Firestore に同期する。
   * 初回ロードや不整合検出時に使用。
   */
  async syncAll(year: number, month: number): Promise<SyncResult> {
    const syncedTypes: string[] = []
    const failedTypes: { dataType: string; error: string }[] = []

    try {
      const slices = await this.supabase.getAllSerializedSlices(year, month)

      if (slices.size === 0) {
        return { success: true, syncedTypes: [], failedTypes: [] }
      }

      await this.firestore.writeSlices(year, month, slices)

      for (const dataType of slices.keys()) {
        syncedTypes.push(dataType)
        await this.logSync(year, month, dataType, 'success')
      }

      await this.firestore.writeSessionMeta(year, month)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      failedTypes.push({ dataType: '*', error: message })
      await this.logSync(year, month, '*', 'failed', message)
    }

    return {
      success: failedTypes.length === 0,
      syncedTypes,
      failedTypes,
    }
  }

  /**
   * 特定データ種別のみを Supabase → Firestore に同期する。
   * 部分的なインポート後に使用。
   */
  async syncSlices(
    year: number,
    month: number,
    dataTypes: readonly string[],
  ): Promise<SyncResult> {
    const syncedTypes: string[] = []
    const failedTypes: { dataType: string; error: string }[] = []

    for (const dataType of dataTypes) {
      try {
        const payload = await this.supabase.getSerializedSlice(year, month, dataType)
        if (payload !== null) {
          await this.firestore.writeSlice(year, month, dataType, payload)
          syncedTypes.push(dataType)
          await this.logSync(year, month, dataType, 'success')
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        failedTypes.push({ dataType, error: message })
        await this.logSync(year, month, dataType, 'failed', message)
      }
    }

    if (syncedTypes.length > 0) {
      try {
        await this.firestore.writeSessionMeta(year, month)
      } catch {
        // メタ更新失敗はデータ同期の成功に影響しない
      }
    }

    return {
      success: failedTypes.length === 0,
      syncedTypes,
      failedTypes,
    }
  }

  /**
   * 指定年月の Firestore キャッシュを削除する。
   */
  async clearFirestoreCache(year: number, month: number): Promise<void> {
    await this.firestore.clearMonth(year, month)
  }

  protected async logSync(
    year: number,
    month: number,
    dataType: string,
    status: 'success' | 'failed',
    errorMessage?: string,
  ): Promise<void> {
    try {
      await this.supabase.writeSyncLog(year, month, dataType, status, errorMessage)
    } catch {
      // ログ記録失敗はサイレントに無視
    }
  }
}
