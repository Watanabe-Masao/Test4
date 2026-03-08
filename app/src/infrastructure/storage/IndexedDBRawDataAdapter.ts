/**
 * RawDataPort の IndexedDB 実装
 *
 * rawFileStore（インフラ層の具体実装）を RawDataPort（アプリケーション層のポート）に
 * 適合させるアダプター。DI はコンポジションルート（App.tsx）で行う。
 */
import type { RawDataPort } from '@/application/ports'
import type { RawFileRecord, RawDataManifest, DataType } from '@/domain/models'
import { rawFileStore } from './rawFileStore'

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
