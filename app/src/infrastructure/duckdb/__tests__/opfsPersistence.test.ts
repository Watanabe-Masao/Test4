/**
 * opfsPersistence テスト
 *
 * OPFS 永続化戦略判定のユニットテスト。
 * DuckDBWorkerClient をモックし、determineReloadStrategy の3戦略分岐を検証する。
 *
 * @taxonomyKind T:unclassified
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  determineReloadStrategy,
  scheduleParquetExport,
  clearParquetCache,
} from '../opfsPersistence'
import type { DuckDBWorkerClient } from '../worker/duckdbWorkerClient'
import type { IntegrityCheckResult, ParquetExportResult } from '../worker/types'

// ── モック ──

function createMockClient(overrides: Partial<DuckDBWorkerClient> = {}): DuckDBWorkerClient {
  return {
    checkIntegrity: vi.fn(),
    exportParquet: vi.fn(),
    importParquet: vi.fn(),
    generateReport: vi.fn(),
    ...overrides,
  } as unknown as DuckDBWorkerClient
}

function makeIntegrity(partial: Partial<IntegrityCheckResult> = {}): IntegrityCheckResult {
  return {
    schemaValid: false,
    monthCount: 0,
    isOpfsPersisted: false,
    hasParquetCache: false,
    ...partial,
  }
}

// ── テスト ──

describe('determineReloadStrategy', () => {
  it('OPFS にスキーマ整合 + データあり → opfs-valid', async () => {
    const integrity = makeIntegrity({
      isOpfsPersisted: true,
      schemaValid: true,
      monthCount: 3,
      hasParquetCache: false,
    })
    const client = createMockClient({
      checkIntegrity: vi.fn().mockResolvedValue(integrity),
    })

    const result = await determineReloadStrategy(client)

    expect(result.strategy).toBe('opfs-valid')
    expect(result.integrity).toEqual(integrity)
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('OPFS DB は空だが Parquet キャッシュあり → parquet-restore', async () => {
    const integrity = makeIntegrity({
      isOpfsPersisted: true,
      schemaValid: true,
      monthCount: 0,
      hasParquetCache: true,
    })
    const client = createMockClient({
      checkIntegrity: vi.fn().mockResolvedValue(integrity),
    })

    const result = await determineReloadStrategy(client)

    expect(result.strategy).toBe('parquet-restore')
    expect(result.integrity.hasParquetCache).toBe(true)
  })

  it('OPFS 未永続化 + Parquet なし → full-reload', async () => {
    const integrity = makeIntegrity({
      isOpfsPersisted: false,
      schemaValid: false,
      monthCount: 0,
      hasParquetCache: false,
    })
    const client = createMockClient({
      checkIntegrity: vi.fn().mockResolvedValue(integrity),
    })

    const result = await determineReloadStrategy(client)

    expect(result.strategy).toBe('full-reload')
  })

  it('スキーマ不整合 + Parquet キャッシュあり → parquet-restore', async () => {
    const integrity = makeIntegrity({
      isOpfsPersisted: true,
      schemaValid: false,
      monthCount: 0,
      hasParquetCache: true,
    })
    const client = createMockClient({
      checkIntegrity: vi.fn().mockResolvedValue(integrity),
    })

    const result = await determineReloadStrategy(client)

    expect(result.strategy).toBe('parquet-restore')
  })

  it('OPFS 永続化 + スキーマ有効 + データ0件 + Parquet なし → full-reload', async () => {
    const integrity = makeIntegrity({
      isOpfsPersisted: true,
      schemaValid: true,
      monthCount: 0,
      hasParquetCache: false,
    })
    const client = createMockClient({
      checkIntegrity: vi.fn().mockResolvedValue(integrity),
    })

    const result = await determineReloadStrategy(client)

    expect(result.strategy).toBe('full-reload')
  })

  it('checkIntegrity が例外を投げた場合 → full-reload', async () => {
    const client = createMockClient({
      checkIntegrity: vi.fn().mockRejectedValue(new Error('OPFS not supported')),
    })

    const result = await determineReloadStrategy(client)

    expect(result.strategy).toBe('full-reload')
    expect(result.integrity.schemaValid).toBe(false)
    expect(result.integrity.monthCount).toBe(0)
    expect(result.integrity.isOpfsPersisted).toBe(false)
    expect(result.integrity.hasParquetCache).toBe(false)
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })

  it('durationMs は非負値であること', async () => {
    const client = createMockClient({
      checkIntegrity: vi.fn().mockResolvedValue(makeIntegrity()),
    })

    const result = await determineReloadStrategy(client)

    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })
})

describe('scheduleParquetExport', () => {
  let infoSpy: ReturnType<typeof vi.spyOn>
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    infoSpy.mockRestore()
    warnSpy.mockRestore()
  })

  it('エクスポート成功時にログを出力する', async () => {
    const exportResult: ParquetExportResult = {
      tablesExported: 10,
      totalRows: 5000,
      durationMs: 1234,
    }
    const client = createMockClient({
      exportParquet: vi.fn().mockResolvedValue(exportResult),
    })

    await scheduleParquetExport(client)

    expect(console.info).toHaveBeenCalledWith(expect.stringContaining('Parquet cache: 10 tables'))
  })

  it('エクスポート対象が0テーブルの場合はログを出さない', async () => {
    const exportResult: ParquetExportResult = {
      tablesExported: 0,
      totalRows: 0,
      durationMs: 0,
    }
    const client = createMockClient({
      exportParquet: vi.fn().mockResolvedValue(exportResult),
    })

    await scheduleParquetExport(client)

    expect(console.info).not.toHaveBeenCalled()
  })

  it('エクスポート失敗時に警告を出すが例外は投げない', async () => {
    const client = createMockClient({
      exportParquet: vi.fn().mockRejectedValue(new Error('disk full')),
    })

    await expect(scheduleParquetExport(client)).resolves.toBeUndefined()
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('Parquet cache export failed'),
    )
  })
})

describe('clearParquetCache', () => {
  it('navigator.storage.getDirectory 未対応 → false', async () => {
    // jsdom には navigator.storage.getDirectory がない
    const result = await clearParquetCache()
    expect(result).toBe(false)
  })

  it('getDirectory + removeEntry 成功 → true', async () => {
    const mockRemoveEntry = vi.fn().mockResolvedValue(undefined)
    const mockGetDirectory = vi.fn().mockResolvedValue({
      removeEntry: mockRemoveEntry,
    })
    vi.stubGlobal('navigator', {
      storage: { getDirectory: mockGetDirectory },
    })

    const result = await clearParquetCache()

    expect(result).toBe(true)
    expect(mockRemoveEntry).toHaveBeenCalledWith('parquet-cache', { recursive: true })

    vi.unstubAllGlobals()
  })

  it('removeEntry が例外を投げた場合 → false', async () => {
    const mockGetDirectory = vi.fn().mockResolvedValue({
      removeEntry: vi.fn().mockRejectedValue(new Error('NotFoundError')),
    })
    vi.stubGlobal('navigator', {
      storage: { getDirectory: mockGetDirectory },
    })

    const result = await clearParquetCache()

    expect(result).toBe(false)

    vi.unstubAllGlobals()
  })
})
