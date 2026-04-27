/**
 * CategoryMixWeeklyPairHandler — カテゴリ構成比週次の pair 化版
 *
 * @invariant INV-RUN-02 Comparison Integrity
 * @see references/01-principles/safe-performance-principles.md
 *
 * @responsibility R:unclassified
 */
import { categoryMixWeeklyHandler } from './CategoryMixWeeklyHandler'
import { createPairedHandler } from '../createPairedHandler'

export const categoryMixWeeklyPairHandler = createPairedHandler(categoryMixWeeklyHandler, {
  name: 'CategoryMixWeeklyPair',
})
