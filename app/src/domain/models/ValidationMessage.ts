/** バリデーション結果 */
export interface ValidationMessage {
  readonly level: 'error' | 'warning' | 'info'
  readonly message: string
}
