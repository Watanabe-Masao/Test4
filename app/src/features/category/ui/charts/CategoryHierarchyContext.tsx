/**
 * @responsibility R:unclassified
 */

import { useState, useMemo, type ReactNode } from 'react'
import { HierarchyContext } from '@/presentation/components/charts/categoryHierarchyContextDef'
import type { HierarchyFilter } from '@/presentation/components/charts/categoryHierarchyContextDef'

// Type-only re-exports (don't trigger react-refresh warning)
export type { HierarchyFilter } from '@/presentation/components/charts/categoryHierarchyContextDef'

export function CategoryHierarchyProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<HierarchyFilter>({})
  const value = useMemo(() => ({ filter, setFilter }), [filter])
  return <HierarchyContext.Provider value={value}>{children}</HierarchyContext.Provider>
}
