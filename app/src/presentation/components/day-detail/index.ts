/**
 * day-detail — 日別詳細モーダル (shared)
 *
 * 旧配置: `presentation/pages/Dashboard/widgets/DayDetailModal*`
 * 現配置: shared (Budget Simulator など複数の起動点から参照される)
 *
 * Dashboard 側の `widgets/DayDetailModal*` は compat shim として残存しており、
 * 将来 Dashboard MonthlyCalendar からのモーダル呼出を撤去した段階で削除予定。
 */
export { DayDetailModal } from './DayDetailModal'
export type { CompMode } from './DayDetailSalesTab'
