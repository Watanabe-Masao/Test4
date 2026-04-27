/**
 * CategoryHourlyPairHandler — カテゴリ別時間帯集約の pair 化版
 *
 * @invariant INV-RUN-02 Comparison Integrity
 * @see references/01-principles/safe-performance-principles.md
 *
 * @responsibility R:unclassified
 */
import { categoryHourlyHandler } from './CategoryHourlyHandler'
import { createPairedHandler } from '../createPairedHandler'

export const categoryHourlyPairHandler = createPairedHandler(categoryHourlyHandler, {
  name: 'CategoryHourlyPair',
})
