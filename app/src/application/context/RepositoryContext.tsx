/**
 * リポジトリコンテキスト
 *
 * DataRepository インスタンスを React ツリーに提供する。
 * 環境に応じて以下のいずれかが注入される:
 *   - SyncedRepository (IndexedDB + Supabase) … Supabase が利用可能な場合
 *   - IndexedDBRepository (ローカルのみ) … Supabase 未設定の場合
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { DataRepository } from '@/domain/repositories'
import { IndexedDBRepository, indexedDBRepository } from '@/infrastructure/storage/IndexedDBRepository'
import { isSupabaseAvailable } from '@/infrastructure/supabase/client'
import { SupabaseRepository } from '@/infrastructure/supabase/SupabaseRepository'
import { SyncedRepository } from '@/infrastructure/sync/SyncedRepository'

const RepositoryContext = createContext<DataRepository>(indexedDBRepository)

export function useRepository(): DataRepository {
  return useContext(RepositoryContext)
}

/**
 * リポジトリプロバイダ
 *
 * Supabase が利用可能なら SyncedRepository（IndexedDB + Supabase）を、
 * 利用不可なら IndexedDBRepository（ローカルのみ）を提供する。
 */
export function RepositoryProvider({ children }: { readonly children: ReactNode }) {
  const repository = useMemo<DataRepository>(() => {
    if (isSupabaseAvailable()) {
      console.info('[RepositoryProvider] Supabase available — using SyncedRepository (IndexedDB + Supabase)')
      return new SyncedRepository(
        new IndexedDBRepository(),
        new SupabaseRepository(),
      )
    }
    console.info('[RepositoryProvider] Supabase not available — using IndexedDB only')
    return indexedDBRepository
  }, [])

  return (
    <RepositoryContext.Provider value={repository}>
      {children}
    </RepositoryContext.Provider>
  )
}
