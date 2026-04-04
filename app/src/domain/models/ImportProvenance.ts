/**
 * Import Provenance — インポート操作の正本モデル
 *
 * MonthlyData が分析用正規化済みデータの正本であるのに対し、
 * ImportProvenance はその生成根拠（どのファイルが・いつ・どの月に寄与したか）の正本。
 *
 * 設計原則:
 * - ImportExecution: 1回の import 操作そのもの
 * - ImportedArtifact: import された元ファイル単位の記録
 * - MonthAttribution: その artifact がどの月にどれだけ寄与したか
 *
 * 既存の ImportSummary / ImportHistoryEntry は projection として生存する。
 */
import type { DataType } from './Settings'

/** 1回の import 操作を表す正本 */
export interface ImportExecution {
  /** import 操作の一意識別子 */
  readonly importId: string
  /** 取込日時 (ISO 8601) */
  readonly importedAt: string
  /** この操作で処理された全 artifact */
  readonly artifacts: readonly ImportedArtifact[]
}

/** import された元ファイル単位の記録 */
export interface ImportedArtifact {
  /** artifact の一意識別子 */
  readonly artifactId: string
  /** ファイル名 */
  readonly filename: string
  /** フォルダ選択時の相対パス（監査・重複判定用） */
  readonly relativePath?: string
  /** データ種別 */
  readonly dataType: DataType
  /** コンテンツハッシュ (murmurhash3) — 重複検知用 */
  readonly hash: string
  /** ファイルの SHA-256 ハッシュ — raw file 照合用 */
  readonly fileHash?: string
  /** ファイルサイズ (bytes) */
  readonly size: number
  /** 処理成功フラグ */
  readonly ok: boolean
  /** エラーメッセージ（ok=false 時） */
  readonly error?: string
  /** プロセッサの警告 */
  readonly warnings?: readonly string[]
  /** この artifact が寄与した月と件数 */
  readonly attributions: readonly MonthAttribution[]
}

/** artifact がどの月にどれだけ寄与したか */
export interface MonthAttribution {
  /** 対象年 */
  readonly year: number
  /** 対象月 */
  readonly month: number
  /** その月に追加されたレコード数 */
  readonly importedCount: number
  /** その月で既存 hash と一致したか（重複警告用） */
  readonly isDuplicate: boolean
}

/** raw artifact 保存リクエスト */
export interface SaveRawArtifactRequest {
  readonly artifactId: string
  readonly hash: string
  readonly filename: string
  readonly relativePath?: string
  readonly dataType: DataType
  readonly blob: File | Blob
  readonly attributedMonths: readonly { year: number; month: number }[]
}
