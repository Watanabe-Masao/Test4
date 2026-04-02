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

/** INV-CMP-08: dailyMapping の既存違反（構造的例外 — 封じ込め対象） */
export const cmpDailyMapping: readonly AllowlistEntry[] = [
  {
    path: 'presentation/pages/Dashboard/widgets/PrevYearBudgetDetailPanel.tsx',
    reason:
      'sourceDate を比較サブシステムの未移行 interface に合わせるために保持。' +
      'panel 側で比較先解決・時間スコープ判断はしていない（表示分岐のみ）。',
    category: 'structural',
    removalCondition:
      'PrevYearBudgetDetailPanel が sourceDate 非依存の ComparisonViewModel を受け取るようになった時。' +
      '具体的には: comparison subsystem 移行完了後、panel の sourceDate 直接参照を禁止し、' +
      'ComparisonScope / TemporalScope 由来の解決が application 層に一本化された時点で削除。',
  },
] as const
