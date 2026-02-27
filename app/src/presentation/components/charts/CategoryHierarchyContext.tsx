import { useState, useMemo, type ReactNode } from 'react'
import { HierarchyContext } from './categoryHierarchyContextDef'
import type { HierarchyFilter } from './categoryHierarchyContextDef'

// Type-only re-exports (don't trigger react-refresh warning)
export type { HierarchyFilter } from './categoryHierarchyContextDef'

export function CategoryHierarchyProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<HierarchyFilter>({})
  const value = useMemo(() => ({ filter, setFilter }), [filter])
  return <HierarchyContext.Provider value={value}>{children}</HierarchyContext.Provider>
}
