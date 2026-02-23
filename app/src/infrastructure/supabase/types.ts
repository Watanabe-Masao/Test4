/**
 * Supabase データベーススキーマ型定義
 *
 * 正規化された永続化ストレージのテーブル構造を定義する。
 * Supabase CLI の `supabase gen types` で生成した型に準拠する形式。
 */

/** 月別データスライスの行 */
export interface MonthlyDataRow {
  readonly id: string
  readonly year: number
  readonly month: number
  readonly data_type: string
  readonly payload: unknown // JSON
  readonly created_at: string
  readonly updated_at: string
}

/** セッションメタデータの行 */
export interface SessionMetaRow {
  readonly id: string
  readonly year: number
  readonly month: number
  readonly saved_at: string
  readonly created_at: string
}

/** 同期ログの行 */
export interface SyncLogRow {
  readonly id: string
  readonly year: number
  readonly month: number
  readonly data_type: string
  readonly synced_at: string
  readonly status: 'success' | 'failed'
  readonly error_message: string | null
}

/** Supabase Database スキーマ */
export interface Database {
  public: {
    Tables: {
      monthly_data: {
        Row: MonthlyDataRow
        Insert: Omit<MonthlyDataRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<MonthlyDataRow, 'id' | 'created_at'>>
      }
      session_meta: {
        Row: SessionMetaRow
        Insert: Omit<SessionMetaRow, 'id' | 'created_at'>
        Update: Partial<Omit<SessionMetaRow, 'id' | 'created_at'>>
      }
      sync_log: {
        Row: SyncLogRow
        Insert: Omit<SyncLogRow, 'id'>
        Update: Partial<Omit<SyncLogRow, 'id'>>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
