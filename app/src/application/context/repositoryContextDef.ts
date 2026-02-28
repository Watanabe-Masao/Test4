/**
 * RepositoryContext 定義（createContext）
 *
 * react-refresh/only-export-components 対応のため、
 * createContext を .ts ファイルに分離。
 * Provider (.tsx) とフック (useRepository.ts) の両方がここからインポートする。
 *
 * デフォルト値は null。RepositoryProvider が必ずラップすることを前提とする。
 */
import { createContext } from 'react'
import type { DataRepository } from '@/domain/repositories'

export const RepositoryContext = createContext<DataRepository | null>(null)
