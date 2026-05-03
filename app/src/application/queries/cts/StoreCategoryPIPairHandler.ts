/**
 * StoreCategoryPIPairHandler — 店舗×カテゴリ PI の pair 化版
 *
 * @invariant INV-RUN-02 Comparison Integrity
 * @see references/01-foundation/safe-performance-principles.md
 *
 * @responsibility R:unclassified
 */
import { storeCategoryPIHandler } from './StoreCategoryPIHandler'
import { createPairedHandler } from '../createPairedHandler'

export const storeCategoryPIPairHandler = createPairedHandler(storeCategoryPIHandler, {
  name: 'StoreCategoryPIPair',
})
