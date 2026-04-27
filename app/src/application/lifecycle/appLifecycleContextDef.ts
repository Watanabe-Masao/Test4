/**
 * AppLifecycle コンテキスト定義（型 + createContext + hook）
 *
 * react-refresh/only-export-components 対応のため、
 * createContext と型定義を .ts ファイルに分離。
 *
 * @responsibility R:unclassified
 */
import { createContext, useContext } from 'react'
import type { AppLifecycleStatus } from './appLifecycleContract'

const DEFAULT_STATUS: AppLifecycleStatus = {
  phase: 'booting',
  blocking: true,
  error: null,
}

export const AppLifecycleContext = createContext<AppLifecycleStatus>(DEFAULT_STATUS)

export function useAppLifecycleContext(): AppLifecycleStatus {
  return useContext(AppLifecycleContext)
}
