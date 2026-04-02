/**
 * RawFilePort — 原本ファイル保存の契約
 *
 * インポート時の原本ファイルを IndexedDB に保存する機能。
 * application 層は Port のみに依存し、infra 実装は AdapterProvider から注入。
 */
import type { DataType } from '@/domain/models/storeTypes'

export interface RawFilePort {
  saveFile(
    year: number,
    month: number,
    dataType: DataType,
    file: File | Blob,
    filename?: string,
    relativePath?: string,
  ): Promise<unknown>
}
