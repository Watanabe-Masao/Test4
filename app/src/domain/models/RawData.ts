/**
 * Raw データ層の型定義
 *
 * 5層データモデル（raw_data → normalized_records → derived_metrics → settings → metadata）
 * における最下層。元ファイル（CSV/XLSX）のメタデータを型安全に管理する。
 *
 * 実体（Blob）は infrastructure/storage/rawFileStore に保存される。
 * domain 層では型定義のみを持ち、インフラ依存を持たない。
 *
 * @responsibility R:unclassified
 */
import type { DataType } from './Settings'

/** rawFileStore に保存される元ファイルのメタデータ */
export interface RawFileRecord {
  /** ファイル名 */
  readonly filename: string
  /** フォルダ選択時の相対パス（監査・重複判定用） */
  readonly relativePath?: string
  /** データ種別（purchase, classifiedSales 等） */
  readonly dataType: DataType
  /** ファイルの SHA-256 ハッシュ（重複検知用） */
  readonly hash: string
  /** ファイルサイズ (bytes) */
  readonly size: number
  /** 保存日時（ISO 8601） */
  readonly savedAt: string
}

/** 月別の Raw データ管理単位（マニフェスト） */
export interface RawDataManifest {
  /** 対象年 */
  readonly year: number
  /** 対象月 */
  readonly month: number
  /** この月に属する元ファイル一覧 */
  readonly files: readonly RawFileRecord[]
  /** 最終インポート日時（ISO 8601） */
  readonly importedAt: string
}
