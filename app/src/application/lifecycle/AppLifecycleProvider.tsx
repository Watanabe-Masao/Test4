/**
 * AppLifecycle Provider
 *
 * usePersistenceState() と useAppLifecycle() を組み合わせ、
 * AppLifecycleContext 経由で全コンポーネントに status を供給する。
 *
 * このコンポーネントは RepositoryProvider の後に配置する必要がある
 * （usePersistenceState が useRepository に依存するため）。
 */
import type { ReactNode } from 'react'
import { usePersistenceState } from '@/application/hooks/usePersistence'
import { useAppLifecycle } from '@/application/runtime-adapters/useAppLifecycle'
import { AppLifecycleContext } from './appLifecycleContextDef'

interface Props {
  readonly children: ReactNode
}

export function AppLifecycleProvider({ children }: Props) {
  const persistenceStatus = usePersistenceState()
  const status = useAppLifecycle({ persistence: persistenceStatus })

  return <AppLifecycleContext.Provider value={status}>{children}</AppLifecycleContext.Provider>
}
