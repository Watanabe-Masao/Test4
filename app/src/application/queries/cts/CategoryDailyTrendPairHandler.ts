/**
 * CategoryDailyTrendPairHandler — カテゴリ別日次トレンドの pair 化版
 *
 * @invariant INV-RUN-02 Comparison Integrity
 * @see references/01-principles/safe-performance-principles.md
 *
 * @responsibility R:unclassified
 */
import { categoryDailyTrendHandler } from './CategoryDailyTrendHandler'
import { createPairedHandler } from '../createPairedHandler'

export const categoryDailyTrendPairHandler = createPairedHandler(categoryDailyTrendHandler, {
  name: 'CategoryDailyTrendPair',
})
