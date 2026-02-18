/** インポートエラーの種類 */
export type ImportErrorType =
  | 'PARSE_ERROR'
  | 'INVALID_FORMAT'
  | 'MISSING_DATA'
  | 'UNKNOWN_TYPE'
  | 'VALIDATION_ERROR'

/** インポートエラー */
export class ImportError extends Error {
  readonly errorType: ImportErrorType
  readonly filename?: string

  constructor(message: string, errorType: ImportErrorType, filename?: string) {
    super(message)
    this.name = 'ImportError'
    this.errorType = errorType
    this.filename = filename
  }
}

export type { ValidationMessage } from '@/domain/models'
