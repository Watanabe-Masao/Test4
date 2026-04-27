/**
 * CategoryHierarchy コンテキスト定義（型 + createContext）
 *
 * react-refresh/only-export-components 対応のため、
 * createContext と型定義を .ts ファイルに分離。
 * @responsibility R:unclassified
 */
import { createContext } from 'react'

/** 階層ドリルダウンのフィルタ状態 */
export interface HierarchyFilter {
  departmentCode?: string
  departmentName?: string
  lineCode?: string
  lineName?: string
}

export interface HierarchyContextValue {
  filter: HierarchyFilter
  setFilter: (filter: HierarchyFilter) => void
}

export const HierarchyContext = createContext<HierarchyContextValue>({
  filter: {},
  setFilter: () => {},
})
