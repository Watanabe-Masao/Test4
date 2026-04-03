/**
 * LevelAggregationPairHandler — 階層レベル別集約の pair 化版
 *
 * CategoryPerformanceChart の current/prev 二重取得を1本化する。
 * createPairedHandler ファクトリで LevelAggregationHandler をラップ。
 *
 * @invariant INV-RUN-02 Comparison Integrity
 * @see references/01-principles/safe-performance-principles.md
 */
import { levelAggregationHandler } from './LevelAggregationHandler'
import { createPairedHandler } from '../createPairedHandler'

export const levelAggregationPairHandler = createPairedHandler(levelAggregationHandler, {
  name: 'LevelAggregationPair',
})
