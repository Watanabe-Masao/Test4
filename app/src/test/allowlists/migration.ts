/**
 * ガードテスト許可リスト — 比較移行（comparisonMigrationGuard 系）
 *
 * 2026-03-24: 全10件を comparisonAccessors（getPrevYearDailyValue / getPrevYearDailySales）に移行完了。
 * prevYear.daily.get() の直接アクセスは消費側から完全に排除された。
 */
import type { AllowlistEntry } from './types'

/** INV-CMP-01: prevYear.daily.get(day) — 全件解消済み。凍結 */
export const cmpPrevYearDaily: readonly AllowlistEntry[] = [] as const

/** INV-CMP-03: comparisonFrame.previous — 全件解消済み。凍結 */
export const cmpFramePrevious: readonly AllowlistEntry[] = [] as const

/** INV-CMP-08: dailyMapping — ViewModel に集約済み。VM のみ許可 */
export const cmpDailyMapping: readonly AllowlistEntry[] = [
  {
    path: 'presentation/pages/Dashboard/widgets/PrevYearBudgetDetailPanel.vm.ts',
    reason:
      'buildBudgetDetailRows() で dailyMapping → TableRow 変換。' +
      'Panel は VM 関数の結果を表示するだけ。dailyMapping の直接ループは VM に閉じ込められている。',
    category: 'structural',
    removalCondition: 'dailyMapping が ComparisonScope.alignmentMap 経由に完全移行された時',
  },
] as const
