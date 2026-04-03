/**
 * CategoryTimeRecordsPairHandler — カテゴリ別時間帯レコードの pair 化版
 *
 * @invariant INV-RUN-02 Comparison Integrity
 * @see references/01-principles/safe-performance-principles.md
 */
import { categoryTimeRecordsHandler } from './CategoryTimeRecordsHandler'
import { createPairedHandler } from '../createPairedHandler'

export const categoryTimeRecordsPairHandler = createPairedHandler(categoryTimeRecordsHandler, {
  name: 'CategoryTimeRecordsPair',
})
