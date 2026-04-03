/**
 * StoreDaySummaryPairHandler — 店舗日次サマリーの pair 化版
 *
 * @invariant INV-RUN-02 Comparison Integrity
 * @see references/01-principles/safe-performance-principles.md
 */
import { storeDaySummaryHandler } from './StoreDaySummaryHandler'
import { createPairedHandler } from '../createPairedHandler'

export const storeDaySummaryPairHandler = createPairedHandler(storeDaySummaryHandler, {
  name: 'StoreDaySummaryPair',
})
