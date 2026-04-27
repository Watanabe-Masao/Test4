/**
 * HourlyAggregationPairHandler — 時間帯別集約の pair 化版
 *
 * @invariant INV-RUN-02 Comparison Integrity
 * @see references/01-principles/safe-performance-principles.md
 *
 * @responsibility R:unclassified
 */
import { hourlyAggregationHandler } from './HourlyAggregationHandler'
import { createPairedHandler } from '../createPairedHandler'

export const hourlyAggregationPairHandler = createPairedHandler(hourlyAggregationHandler, {
  name: 'HourlyAggregationPair',
})
