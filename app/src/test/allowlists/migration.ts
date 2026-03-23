/**
 * ガードテスト許可リスト — 比較移行（comparisonMigrationGuard 系）
 *
 * ## P4 再評価メモ（2026-03-23）
 *
 * cmpPrevYearDaily のデータソースは既に V2（useComparisonModule.daily）に移行済み。
 * `prevYear.daily.get(toDateKeyFromParts(...))` は V2 の PrevYearData Map への正当なアクセス。
 *
 * ガードが防いでいるリスク:
 * - toDateKeyFromParts で「当月の日付」を構築してアクセスすると、
 *   same-DOW alignment 時に alignment が無視される可能性
 * - 新規コードが alignment を意識せず Map に直接アクセスするのを防止
 *
 * カテゴリ変更: migration → structural
 * - データソース移行は完了。残るのはアクセスパターンのリスク管理
 * - ヘルパー関数で .get() を隠すのは表面的回避であり本質的改善ではない
 * - 各ファイルの改修タイミングで、alignment を意識したアクセスに移行する
 */
import type { AllowlistEntry } from './types'

/**
 * INV-CMP-01: prevYear.daily.get(day) — 直接 Map アクセス（凍結）
 *
 * データソースは V2 移行済み。アクセスパターンのリスク管理として凍結。
 * 新規ファイルでの使用は禁止。既存ファイルは改修タイミングで段階的に対応。
 */
export const cmpPrevYearDaily: readonly AllowlistEntry[] = [
  {
    path: 'presentation/pages/Daily/DailyPage.tsx',
    reason: 'V2 データソース移行済み。alignment 考慮のアクセスパターン改善は改修時',
    category: 'structural',
    removalCondition: 'alignment-aware なアクセスパターンに移行時',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/AlertPanel.tsx',
    reason: 'V2 データソース移行済み。alignment 考慮のアクセスパターン改善は改修時',
    category: 'structural',
    removalCondition: 'alignment-aware なアクセスパターンに移行時',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/DayDetailModal.tsx',
    reason: 'V2 データソース移行済み。alignment 考慮のアクセスパターン改善は改修時',
    category: 'structural',
    removalCondition: 'alignment-aware なアクセスパターンに移行時',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/DayDetailModal.vm.ts',
    reason: 'V2 データソース移行済み。alignment 考慮のアクセスパターン改善は改修時',
    category: 'structural',
    removalCondition: 'alignment-aware なアクセスパターンに移行時',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/MonthlyCalendar.tsx',
    reason: 'V2 データソース移行済み。alignment 考慮のアクセスパターン改善は改修時',
    category: 'structural',
    removalCondition: 'alignment-aware なアクセスパターンに移行時',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/calendarUtils.ts',
    reason: 'V2 データソース移行済み。alignment 考慮のアクセスパターン改善は改修時',
    category: 'structural',
    removalCondition: 'alignment-aware なアクセスパターンに移行時',
  },
  {
    path: 'presentation/pages/Insight/InsightTabBudget.tsx',
    reason: 'V2 データソース移行済み。alignment 考慮のアクセスパターン改善は改修時',
    category: 'structural',
    removalCondition: 'alignment-aware なアクセスパターンに移行時',
  },
  {
    path: 'presentation/pages/Forecast/ForecastPage.helpers.ts',
    reason: 'V2 データソース移行済み。alignment 考慮のアクセスパターン改善は改修時',
    category: 'structural',
    removalCondition: 'alignment-aware なアクセスパターンに移行時',
  },
  {
    path: 'application/hooks/useBudgetChartData.ts',
    reason: 'V2 データソース移行済み。alignment 考慮のアクセスパターン改善は改修時',
    category: 'structural',
    removalCondition: 'alignment-aware なアクセスパターンに移行時',
  },
  {
    path: 'application/usecases/clipExport/buildClipBundle.ts',
    reason: 'V2 データソース移行済み。alignment 考慮のアクセスパターン改善は改修時',
    category: 'structural',
    removalCondition: 'alignment-aware なアクセスパターンに移行時',
  },
] as const

/** INV-CMP-03: comparisonFrame.previous — 全件解消済み。凍結 */
export const cmpFramePrevious: readonly AllowlistEntry[] = [] as const

/** INV-CMP-08: dailyMapping の既存違反（凍結） */
export const cmpDailyMapping: readonly AllowlistEntry[] = [
  {
    path: 'presentation/pages/Dashboard/widgets/PrevYearBudgetDetailPanel.tsx',
    reason: 'sourceDate を落とさない正当な使用のため許可',
    category: 'structural',
    removalCondition: '比較サブシステム移行完了時',
  },
] as const
