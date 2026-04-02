/**
 * データ復旧フック
 *
 * 原本ファイル（rawFileStore）の一覧管理と、
 * DuckDB の再構築・キャッシュ削除を UI に提供する。
 */
import { useState, useEffect, useCallback } from 'react'
import { useContext } from 'react'
import { AdapterContext } from '@/application/context/adapterContextDef'
import type { RawFileEntry } from '@/domain/ports/RawFilePort'
import {
  rebuildFromIndexedDB,
  deleteDatabaseFile,
  type RebuildResult,
} from '@/infrastructure/duckdb/recovery'
import type { AsyncDuckDB, AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DataRepository } from '@/domain/repositories'

export interface RawFileGroup {
  readonly year: number
  readonly month: number
  readonly files: readonly RawFileEntry[]
}

export function useDataRecovery(
  conn: AsyncDuckDBConnection | null,
  db: AsyncDuckDB | null,
  repo: DataRepository | null,
): {
  rawFileGroups: readonly RawFileGroup[]
  canRebuild: boolean
  isRebuilding: boolean
  lastRebuildResult: RebuildResult | null
  rebuildDuckDB: () => Promise<RebuildResult | null>
  clearDuckDBCache: () => Promise<boolean>
  refreshRawFiles: () => Promise<void>
} {
  const adapters = useContext(AdapterContext)
  const rawFile = adapters?.rawFile
  const [rawFileGroups, setRawFileGroups] = useState<readonly RawFileGroup[]>([])
  const [isRebuilding, setIsRebuilding] = useState(false)
  const [lastRebuildResult, setLastRebuildResult] = useState<RebuildResult | null>(null)

  const refreshRawFiles = useCallback(async () => {
    if (!repo || !rawFile) {
      setRawFileGroups([])
      return
    }
    try {
      const storedMonths = await repo.listStoredMonths()
      const groups: RawFileGroup[] = []
      for (const { year, month } of storedMonths) {
        const files = await rawFile.listFiles(year, month)
        if (files.length > 0) {
          groups.push({ year, month, files })
        }
      }
      setRawFileGroups(groups)
    } catch {
      setRawFileGroups([])
    }
  }, [repo])

  useEffect(() => {
    refreshRawFiles()
  }, [refreshRawFiles])

  const canRebuild = conn !== null && db !== null && repo !== null

  const rebuildDuckDB = useCallback(async (): Promise<RebuildResult | null> => {
    if (!conn || !db || !repo) return null
    setIsRebuilding(true)
    try {
      const result = await rebuildFromIndexedDB(conn, db, repo)
      setLastRebuildResult(result)
      return result
    } finally {
      setIsRebuilding(false)
    }
  }, [conn, db, repo])

  const clearDuckDBCache = useCallback(async (): Promise<boolean> => {
    return deleteDatabaseFile()
  }, [])

  return {
    rawFileGroups,
    canRebuild,
    isRebuilding,
    lastRebuildResult,
    rebuildDuckDB,
    clearDuckDBCache,
    refreshRawFiles,
  }
}
