/**
 * @deprecated infrastructure 内部からの後方互換 re-export。
 * 新規コードは '@/application/services/diffCalculator' からインポートすること。
 */
export {
  calculateDiff,
  summarizeDiff,
  type ChangeType,
} from '@/application/services/diffCalculator'
export type { FieldChange, DataTypeDiff, DiffResult } from '@/domain/models'
