/**
 * Compat shim — styled-components を shared 位置
 * (`@/presentation/components/day-detail/DayDetailModal.styles`) に移設済み。
 *
 * 既存の Dashboard 側 import (`./DayDetailModal.styles`) を壊さないための
 * re-export のみ。将来 Dashboard 側の呼出が撤去された段階で削除する。
 * @sunsetCondition 本 barrel は永続的構造（モジュール entry point / 後方互換 re-export）
 * @expiresAt 2099-12-31
 * @reason ADR-C-004 / F1 原則: モジュール entry の後方互換 barrel re-export
 */
export * from '@/presentation/components/day-detail/DayDetailModal.styles'
