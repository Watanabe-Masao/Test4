/**
 * DistinctDayCountPairHandler — 営業日数カウントの pair 化版
 *
 * @invariant INV-RUN-02 Comparison Integrity
 * @see references/01-foundation/safe-performance-principles.md
 *
 * @responsibility R:unclassified
 */
import { distinctDayCountHandler } from './DistinctDayCountHandler'
import { createPairedHandler } from '../createPairedHandler'

export const distinctDayCountPairHandler = createPairedHandler(distinctDayCountHandler, {
  name: 'DistinctDayCountPair',
})
