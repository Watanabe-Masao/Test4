/**
 * HourDowMatrixPairHandler — 時間×曜日マトリクスの pair 化版
 *
 * @invariant INV-RUN-02 Comparison Integrity
 * @see references/01-foundation/safe-performance-principles.md
 *
 * @responsibility R:unclassified
 */
import { hourDowMatrixHandler } from './HourDowMatrixHandler'
import { createPairedHandler } from '../createPairedHandler'

export const hourDowMatrixPairHandler = createPairedHandler(hourDowMatrixHandler, {
  name: 'HourDowMatrixPair',
})
