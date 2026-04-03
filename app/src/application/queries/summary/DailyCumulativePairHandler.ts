/**
 * DailyCumulativePairHandler — 日次累計の pair 化版
 *
 * @invariant INV-RUN-02 Comparison Integrity
 * @see references/01-principles/safe-performance-principles.md
 */
import { dailyCumulativeHandler } from './DailyCumulativeHandler'
import { createPairedHandler } from '../createPairedHandler'

export const dailyCumulativePairHandler = createPairedHandler(dailyCumulativeHandler, {
  name: 'DailyCumulativePair',
})
