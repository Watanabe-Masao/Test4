/**
 * AggregatedRatesPairHandler — 集約率の pair 化版
 *
 * @invariant INV-RUN-02 Comparison Integrity
 * @see references/01-principles/safe-performance-principles.md
 */
import { aggregatedRatesHandler } from './AggregatedRatesHandler'
import { createPairedHandler } from '../createPairedHandler'

export const aggregatedRatesPairHandler = createPairedHandler(aggregatedRatesHandler, {
  name: 'AggregatedRatesPair',
})
