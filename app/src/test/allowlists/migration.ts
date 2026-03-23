/**
 * ガードテスト許可リスト — 比較移行（comparisonMigrationGuard 系）
 *
 * ## P4 再評価メモ（2026-03-23、追加検証済み）
 *
 * cmpPrevYearDaily のデータソースは V2（useComparisonModule.daily）に移行済み。
 * `prevYear.daily.get(toDateKeyFromParts(year, month, day))` は V2 の PrevYearData Map への
 * **正当かつ正しいアクセスパターン**。
 *
 * ## alignment は Map 構築時に適用済み
 *
 * `aggregateDailyByAlignment()` が `entry.targetDayKey`（当期の日付キー）をキーとして
 * Map を構築する。`toDateKeyFromParts(year, month, day)` で当期の日付を渡すのは
 * このキーに正確に一致する。alignment は消費側ではなく生産側で処理済み。
 *
 * ## ガードの役割
 *
 * 新規コードが prevYear.daily.get() を使う場合、year/month/day が「当期の日付」であることを
 * 前提とする。前年の日付を渡すとキーが不一致になるため、ガードで新規追加を禁止し、
 * 既存コードの正しさを allowlist で管理する。
 *
 * カテゴリ: structural（正当なアクセスパターン。新規追加禁止のみ）
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
