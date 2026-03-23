/**
 * ガードテスト許可リスト — 比較移行（comparisonMigrationGuard 系）
 */
import type { AllowlistEntry } from './types'

/** INV-CMP-01: prevYear.daily.get(day) の既存違反（凍結） */
export const cmpPrevYearDaily: readonly AllowlistEntry[] = [
  {
    path: 'presentation/pages/Daily/DailyPage.tsx',
    reason: '旧 daily.get パターン',
    category: 'migration',
    removalCondition: 'V2 比較移行完了時',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/AlertPanel.tsx',
    reason: '旧 daily.get パターン',
    category: 'migration',
    removalCondition: 'V2 比較移行完了時',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/DayDetailModal.tsx',
    reason: '旧 daily.get パターン',
    category: 'migration',
    removalCondition: 'V2 比較移行完了時',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/DayDetailModal.vm.ts',
    reason: '旧 daily.get パターン',
    category: 'migration',
    removalCondition: 'V2 比較移行完了時',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/MonthlyCalendar.tsx',
    reason: '旧 daily.get パターン',
    category: 'migration',
    removalCondition: 'V2 比較移行完了時',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/calendarUtils.ts',
    reason: '旧 daily.get パターン',
    category: 'migration',
    removalCondition: 'V2 比較移行完了時',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/YoYWaterfallChart.tsx',
    reason: '旧 daily.get パターン',
    category: 'migration',
    removalCondition: 'V2 比較移行完了時',
  },
  {
    path: 'presentation/pages/Insight/InsightTabBudget.tsx',
    reason: '旧 daily.get パターン',
    category: 'migration',
    removalCondition: 'V2 比較移行完了時',
  },
  {
    path: 'presentation/pages/Forecast/ForecastPage.helpers.ts',
    reason: '旧 daily.get パターン',
    category: 'migration',
    removalCondition: 'V2 比較移行完了時',
  },
  {
    path: 'application/hooks/useBudgetChartData.ts',
    reason: '旧 daily.get パターン',
    category: 'migration',
    removalCondition: 'V2 比較移行完了時',
  },
  {
    path: 'application/usecases/clipExport/buildClipBundle.ts',
    reason: '旧 daily.get パターン',
    category: 'migration',
    removalCondition: 'V2 比較移行完了時',
  },
] as const

/** INV-CMP-03: comparisonFrame.previous の既存違反（凍結） */
export const cmpFramePrevious: readonly AllowlistEntry[] = [
  {
    path: 'presentation/pages/Dashboard/widgets/YoYWaterfallChart.tsx',
    reason: '旧 previous パターン',
    category: 'migration',
    removalCondition: 'V2 比較移行完了時',
  },
] as const

/** INV-CMP-08: dailyMapping の既存違反（凍結） */
export const cmpDailyMapping: readonly AllowlistEntry[] = [
  {
    path: 'presentation/pages/Dashboard/widgets/PrevYearBudgetDetailPanel.tsx',
    reason: 'sourceDate を落とさない正当な使用のため許可',
    category: 'structural',
    removalCondition: '比較サブシステム移行完了時',
  },
] as const
