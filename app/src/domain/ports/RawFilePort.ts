/**
 * RawFilePort — 原本ファイル保存の契約
 *
 * インポート時の原本ファイルを IndexedDB に保存する機能。
 * application 層は Port のみに依存し、infra 実装は AdapterProvider から注入。
 *
 * @responsibility R:unclassified
 */
import type { DataType } from '@/domain/models/storeTypes'

export interface RawFileEntry {
  readonly filename: string
  readonly dataType: string
  readonly size: number
  readonly savedAt: string
  readonly relativePath?: string
  readonly hash: string
}

export interface RawFilePort {
  saveFile(
    year: number,
    month: number,
    dataType: DataType,
    file: File | Blob,
    filename?: string,
    relativePath?: string,
  ): Promise<unknown>

  listFiles(year: number, month: number): Promise<readonly RawFileEntry[]>
}
