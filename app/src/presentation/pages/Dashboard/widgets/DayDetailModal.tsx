/**
 * Compat shim — `DayDetailModal` は shared 位置
 * (`@/presentation/components/day-detail/`) に移設済み。
 *
 * 既存の Dashboard 側 import (`./DayDetailModal`) を壊さないための
 * re-export のみ。将来 Dashboard 側の呼出が撤去された段階で削除する。
 */
export { DayDetailModal } from '@/presentation/components/day-detail/DayDetailModal'
export type { CompMode } from '@/presentation/components/day-detail/DayDetailSalesTab'
