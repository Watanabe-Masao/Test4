/**
 * リポジトリコンテキスト
 *
 * DataRepository インスタンスを React ツリーに提供する。
 * 具体的な実装（IndexedDBRepository 等）は外部から注入する。
 *
 * @responsibility R:unclassified
 */
import type { ReactNode } from 'react'
import type { DataRepository } from '@/domain/repositories'
import { RepositoryContext } from './repositoryContextDef'

/**
 * リポジトリプロバイダ
 *
 * repository prop で具体的な DataRepository 実装を注入する。
 * App.tsx（コンポジションルート）で indexedDBRepository を渡す。
 */
export function RepositoryProvider({
  repository,
  children,
}: {
  readonly repository: DataRepository
  readonly children: ReactNode
}) {
  return <RepositoryContext.Provider value={repository}>{children}</RepositoryContext.Provider>
}
