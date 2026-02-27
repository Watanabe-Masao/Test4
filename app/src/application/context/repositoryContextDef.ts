/**
 * RepositoryContext 定義（createContext）
 *
 * react-refresh/only-export-components 対応のため、
 * createContext を .ts ファイルに分離。
 * Provider (.tsx) とフック (useRepository.ts) の両方がここからインポートする。
 */
import { createContext } from 'react'
import type { DataRepository } from '@/domain/repositories'
import { indexedDBRepository } from '@/infrastructure/storage/IndexedDBRepository'

export const RepositoryContext = createContext<DataRepository>(indexedDBRepository)
