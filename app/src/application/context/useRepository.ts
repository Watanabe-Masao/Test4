/**
 * useRepository フック（RepositoryContext から分離）
 *
 * react-refresh/only-export-components 対応のため、
 * コンポーネント（Provider）とフックを別ファイルに分離。
 */
import { useContext } from 'react'
import { RepositoryContext } from './repositoryContextDef'
import type { DataRepository } from '@/domain/repositories'

export function useRepository(): DataRepository {
  return useContext(RepositoryContext)
}
