/**
 * HourDowMatrixPairHandler — 時間×曜日マトリクスの pair 化版
 *
 * @invariant INV-RUN-02 Comparison Integrity
 * @see references/01-principles/safe-performance-principles.md
 */
import { hourDowMatrixHandler } from './HourDowMatrixHandler'
import { createPairedHandler } from '../createPairedHandler'

export const hourDowMatrixPairHandler = createPairedHandler(hourDowMatrixHandler, {
  name: 'HourDowMatrixPair',
})
