/**
 * RawDataPort — raw_data 層のストレージ契約
 *
 * 元ファイル（CSV/XLSX）のメタデータと Blob を管理する。
 * Domain 層で定義することで、application/ と infrastructure/ の両方が
 * この契約に依存できる（A4: 取得対象の契約は Domain で定義）。
 */
import type { RawFileRecord, RawDataManifest } from '@/domain/models/analysis'
import type { DataType } from '@/domain/models/storeTypes'

export interface RawDataPort {
  /** 元ファイルを保存し、メタデータを返す */
  saveRawFile(
    year: number,
    month: number,
    dataType: DataType,
    file: File | Blob,
    filename?: string,
    relativePath?: string,
  ): Promise<RawFileRecord>

  /** 指定年月の Raw データマニフェストを取得する */
  getRawManifest(year: number, month: number): Promise<RawDataManifest | null>

  /** 指定年月の元ファイルを取得する */
  getRawFile(
    year: number,
    month: number,
    dataType: DataType,
  ): Promise<{ entry: RawFileRecord; blob: Blob } | null>

  /** 指定年月の全元ファイルを削除する */
  clearRawFiles(year: number, month: number): Promise<void>
}
