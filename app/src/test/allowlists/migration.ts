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

/** INV-CMP-08: dailyMapping の直接ループ（buildSameDowPoints 移行待ち） */
export const cmpDailyMapping: readonly AllowlistEntry[] = [
  {
    path: 'presentation/pages/Dashboard/widgets/PrevYearBudgetDetailPanel.tsx',
    reason:
      'dailyMapping.map() で日別行を直接構築。sourceDate は消滅済みだが、' +
      'dailyMapping の直接ループが残存。buildSameDowPoints への移行で解消。',
    category: 'structural',
    removalCondition:
      'PrevYearBudgetDetailPanel が buildSameDowPoints() を使用するようになった時',
  },
] as const
