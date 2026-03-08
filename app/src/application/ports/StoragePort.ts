/**
 * StoragePort — 5層データモデルに対応したストレージポート
 *
 * DataRepository（domain/repositories）は normalized_records 層を中心に扱う。
 * StoragePort は raw_data 層の操作を追加し、5層全体を統一的にカバーする。
 *
 * 5層データモデル:
 *   1. raw_data           — 元ファイルのメタデータ管理（Blob は infrastructure 内部）
 *   2. normalized_records — DataRepository で管理済み
 *   3. derived_metrics    — DataRepository.saveSummaryCache で管理済み
 *   4. settings           — settingsStore で管理済み
 *   5. metadata           — DataRepository.saveImportHistory で管理済み
 *
 * DuckDB は normalized_records の派生キャッシュであり、StoragePort の管理対象外。
 * 破損時は rebuildFromIndexedDB() で再構築する（recovery.ts）。
 */
import type { RawFileRecord, RawDataManifest, DataType } from '@/domain/models'

/**
 * raw_data 層のストレージポート
 *
 * 元ファイル（CSV/XLSX）のメタデータとBlobを管理する。
 * DataRepository の normalized_records 操作と組み合わせて使用する。
 */
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
