/**
 * インポート結果の型定義
 *
 * presentation 層が application/usecases/ の実装に依存せず、
 * domain/ の型として参照できるようにする（@guard A4）。
 */
import type { DataType } from './Settings'

/** 単一ファイルのインポート結果 */
export interface FileImportResult {
  readonly ok: boolean
  readonly filename: string
  /** フォルダ選択時の相対パス（webkitRelativePath）。監査・重複判定に使用 */
  readonly relativePath?: string
  readonly type: DataType | null
  readonly typeName: string | null
  readonly error?: string
  readonly rowCount?: number
  readonly skippedRows?: readonly string[]
  /** プロセッサの警告（ヘッダ形式不正、0件結果など） */
  readonly warnings?: readonly string[]
}

/** バッチインポートの全体結果 */
export interface ImportSummary {
  readonly results: readonly FileImportResult[]
  readonly successCount: number
  readonly failureCount: number
  readonly skippedFiles?: readonly string[]
}
