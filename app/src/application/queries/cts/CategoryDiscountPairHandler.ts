/**
 * CategoryDiscountPairHandler — カテゴリ別値引きの pair 化版
 *
 * @invariant INV-RUN-02 Comparison Integrity
 * @see references/01-principles/safe-performance-principles.md
 */
import { categoryDiscountHandler } from './CategoryDiscountHandler'
import { createPairedHandler } from '../createPairedHandler'

export const categoryDiscountPairHandler = createPairedHandler(categoryDiscountHandler, {
  name: 'CategoryDiscountPair',
})
