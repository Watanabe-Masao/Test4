/** バリデーション結果 */
export interface ValidationMessage {
  readonly level: 'error' | 'warning' | 'info'
  readonly message: string
  /** 詳細行（折りたたみ表示用） */
  readonly details?: readonly string[]
}
