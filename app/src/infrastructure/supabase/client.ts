/**
 * Supabase クライアント設定
 *
 * 環境変数から接続情報を取得し、Supabase クライアントを初期化する。
 * マスターDB（正規化・永続化）としての書き込みを担当する。
 *
 * 型付きクライアントは使用しない（Supabase の DB スキーマ型推論と
 * erasableSyntaxOnly 制約の互換性問題を回避するため）。
 * 代わりに types.ts で定義した型を呼び出し側で使用する。
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let client: SupabaseClient | null = null

/**
 * Supabase クライアントのシングルトンを取得する。
 * 環境変数が未設定の場合は null を返す。
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (client) return client

  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

  if (!url || !anonKey) return null

  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  })

  return client
}

/**
 * Supabase が利用可能か判定する
 */
export function isSupabaseAvailable(): boolean {
  return getSupabaseClient() !== null
}
