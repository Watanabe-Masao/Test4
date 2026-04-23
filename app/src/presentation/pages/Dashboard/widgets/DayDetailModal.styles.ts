/**
 * Compat shim — styled-components を shared 位置
 * (`@/presentation/components/day-detail/DayDetailModal.styles`) に移設済み。
 *
 * 既存の Dashboard 側 import (`./DayDetailModal.styles`) を壊さないための
 * re-export のみ。将来 Dashboard 側の呼出が撤去された段階で削除する。
 */
export * from '@/presentation/components/day-detail/DayDetailModal.styles'
