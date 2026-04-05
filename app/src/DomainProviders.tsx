/**
 * Domain Providers — 認証 + データ基盤 + ライフサイクル
 *
 * ビジネスドメインのコンテキストを提供する中間層。
 * Repository, Adapter, Persistence, Lifecycle を束ねる。
 */
import type { ReactNode } from 'react'
import { RepositoryProvider, PersistenceProvider } from '@/application/context'
import { AdapterProvider } from '@/application/context/AdapterProvider'
import { AppLifecycleProvider } from '@/application/lifecycle'
import { AuthProvider } from '@/application/context/AuthContext'
import { indexedDBRepository } from '@/infrastructure/storage/IndexedDBRepository'
import { weatherAdapter } from '@/infrastructure/adapters/weatherAdapter'
import { backupAdapter } from '@/infrastructure/adapters/backupAdapter'
import { fileSystemAdapter } from '@/infrastructure/adapters/fileSystemAdapter'
import { storagePersistenceAdapter } from '@/infrastructure/adapters/storagePersistenceAdapter'
import { exportService } from '@/application/usecases/export/ExportService'
import { rawFileStore } from '@/infrastructure/storage/rawFileStore'
import type { AdapterSet } from '@/application/context/adapterContextDef'

const adapters: AdapterSet = {
  weather: weatherAdapter,
  backup: backupAdapter,
  fileSystem: fileSystemAdapter,
  storagePersistence: storagePersistenceAdapter,
  export: exportService,
  rawFile: rawFileStore,
}

interface Props {
  readonly children: ReactNode
}

export function DomainProviders({ children }: Props) {
  return (
    <AuthProvider>
      <RepositoryProvider repository={indexedDBRepository}>
        <AdapterProvider adapters={adapters}>
          <PersistenceProvider>
            <AppLifecycleProvider>{children}</AppLifecycleProvider>
          </PersistenceProvider>
        </AdapterProvider>
      </RepositoryProvider>
    </AuthProvider>
  )
}
