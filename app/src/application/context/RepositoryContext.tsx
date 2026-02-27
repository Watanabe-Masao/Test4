/**
 * リポジトリコンテキスト
 *
 * DataRepository インスタンスを React ツリーに提供する。
 * IndexedDBRepository（ローカルのみ）を使用する。
 */
import type { ReactNode } from 'react'
import { RepositoryContext } from './repositoryContextDef'
import { indexedDBRepository } from '@/infrastructure/storage/IndexedDBRepository'

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
