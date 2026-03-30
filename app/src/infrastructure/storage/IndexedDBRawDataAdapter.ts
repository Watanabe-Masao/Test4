/**
 * RawDataPort の IndexedDB 実装
 *
 * rawFileStore（インフラ層の具体実装）を RawDataPort（アプリケーション層のポート）に
 * 適合させるアダプター。DI はコンポジションルート（App.tsx）で行う。
 */
import type { RawDataPort } from '@/domain/ports'
import type { RawFileRecord, RawDataManifest } from '@/domain/models/analysis'
import type { DataType } from '@/domain/models/storeTypes'
import { z } from 'zod'
import { rawFileStore } from './rawFileStore'

/** rawFileStore エントリの runtime 検証スキーマ */
const RawFileEntrySchema = z.object({
  filename: z.string(),
  relativePath: z.string().optional(),
  dataType: z.string(),
  hash: z.string(),
  size: z.number(),
  savedAt: z.string(),
})

export class IndexedDBRawDataAdapter implements RawDataPort {
  async saveRawFile(
    year: number,
    month: number,
    dataType: DataType,
    file: File | Blob,
    filename?: string,
    relativePath?: string,
  ): Promise<RawFileRecord> {
    const entry = await rawFileStore.saveFile(year, month, dataType, file, filename, relativePath)
    // runtime 検証（safeParse — 保存結果の整合性確認）
    const validated = RawFileEntrySchema.safeParse(entry)
    if (!validated.success) {
      console.warn(
        '[IndexedDBRawDataAdapter] saveRawFile schema mismatch:',
        validated.error.message,
      )
    }
    return {
      filename: entry.filename,
      ...(entry.relativePath ? { relativePath: entry.relativePath } : {}),
      dataType: entry.dataType as DataType,
      hash: entry.hash,
      size: entry.size,
      savedAt: entry.savedAt,
    }
  }

  async getRawManifest(year: number, month: number): Promise<RawDataManifest | null> {
    const files = await rawFileStore.listFiles(year, month)
    if (files.length === 0) return null
    // runtime 検証（safeParse — IndexedDB からの復元は fail fast しない）
    const validated = z.array(RawFileEntrySchema).safeParse(files)
    if (!validated.success) {
      console.warn('[IndexedDBRawDataAdapter] manifest schema mismatch:', validated.error.message)
      return null
    }
    return {
      year,
      month,
      files: files.map((f) => ({
        filename: f.filename,
        ...(f.relativePath ? { relativePath: f.relativePath } : {}),
        dataType: f.dataType as DataType,
        hash: f.hash,
        size: f.size,
        savedAt: f.savedAt,
      })),
      importedAt: files[0].savedAt,
    }
  }

  async getRawFile(
    year: number,
    month: number,
    dataType: DataType,
  ): Promise<{ entry: RawFileRecord; blob: Blob } | null> {
    const result = await rawFileStore.getFile(year, month, dataType)
    if (!result) return null
    // runtime 検証（safeParse — IndexedDB からの取得結果を検証）
    const validated = RawFileEntrySchema.safeParse(result.entry)
    if (!validated.success) {
      console.warn('[IndexedDBRawDataAdapter] getRawFile schema mismatch:', validated.error.message)
      return null
    }
    return {
      entry: {
        filename: result.entry.filename,
        ...(result.entry.relativePath ? { relativePath: result.entry.relativePath } : {}),
        dataType: result.entry.dataType as DataType,
        hash: result.entry.hash,
        size: result.entry.size,
        savedAt: result.entry.savedAt,
      },
      blob: result.blob,
    }
  }

  async clearRawFiles(year: number, month: number): Promise<void> {
    return rawFileStore.clearMonth(year, month)
  }
}

/** シングルトンインスタンス */
export const indexedDBRawDataAdapter = new IndexedDBRawDataAdapter()
