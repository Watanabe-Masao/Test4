/**
 * リポジトリコンテキスト
 *
 * DataRepository インスタンスを React ツリーに提供する。
 * IndexedDBRepository（ローカルのみ）を使用する。
 */
import { createContext, useContext, type ReactNode } from 'react'
import type { DataRepository } from '@/domain/repositories'
import { indexedDBRepository } from '@/infrastructure/storage/IndexedDBRepository'

const RepositoryContext = createContext<DataRepository>(indexedDBRepository)

export function useRepository(): DataRepository {
  return useContext(RepositoryContext)
}

/**
 * リポジトリプロバイダ
 *
 * IndexedDBRepository（ローカルのみ）を提供する。
 */
export function RepositoryProvider({ children }: { readonly children: ReactNode }) {
  return (
    <RepositoryContext.Provider value={indexedDBRepository}>{children}</RepositoryContext.Provider>
  )
}
