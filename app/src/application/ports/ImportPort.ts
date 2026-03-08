/**
 * ImportPort — ファイルインポートのポートインターフェース
 *
 * Infrastructure 層のファイルパーサー・バリデーターへの依存を抽象化し、
 * Application 層が具体的なパース実装に直接依存しないようにする。
 *
 * 現時点では FileImportService が infrastructure のパーサーを使用しているが、
 * 将来的にはこの Port を通じて DI 可能にする。
 */
import type { AppSettings, DataType, ImportedData } from '@/domain/models'

/** ファイルパース結果 */
export interface ParseResult {
  readonly data: ImportedData
  readonly detectedTypes: ReadonlySet<DataType>
  readonly warnings: readonly string[]
}

/** バリデーション結果 */
export interface ValidationResult {
  readonly isValid: boolean
  readonly errors: readonly string[]
  readonly warnings: readonly string[]
}

/** ファイルインポートのポートインターフェース */
export interface ImportPort {
  /** ドロップされたファイル群をパースし、ImportedData に変換する */
  parseFiles(
    files: FileList | File[],
    settings: AppSettings,
    overrideType?: DataType,
  ): Promise<ParseResult>

  /** ImportedData のバリデーションを実行する */
  validateData(data: ImportedData): ValidationResult
}
