/**
 * ガードテスト許可リスト — その他（VM React / コンテキスト / 副作用チェーン / 凍結済み）
 */
import type { AllowlistEntry } from './types'

/** DOW 計算オーバーライド許可（全件解消済み。凍結） */
export const dowCalcOverride: readonly AllowlistEntry[] = [] as const

/**
 * ctx 提供データの重複取得許可（useWeatherData 等を ctx 経由ではなく直接 import する例外）
 *
 * Sprint 3 で context slice 化。useQueryBundle → useQuerySlice + useWeatherSlice に分離。
 * slices/ 配下は guard の除外パスで許可。
 */
export const ctxHook: readonly AllowlistEntry[] = [
  {
    path: 'presentation/hooks/useUnifiedWidgetContext.ts',
    ruleId: 'AR-CONVENTION-CONTEXT-SINGLE-SOURCE',
    reason: 'ctx 自体の構築元（slice hook を compose する）',
    category: 'structural',
    removalCondition: 'コンテキスト設計見直し時',
    lifecycle: 'permanent',
    createdAt: '2026-04-08',
  },
  // useQueryBundle: slices/useQuerySlice + slices/useWeatherSlice に分離。guard 除外パスで許可。
  // EtrnTestWidget: retirement 完了（Sprint 3 で廃止）。
] as const

/**
 * VM ファイルでの React import 許可
 *
 * CategoryBenchmarkChart.vm.ts / CategoryBoxPlotChart.vm.ts は features/category/ui/charts/ に
 * 移動済み。features/ は codePatternGuard のスキャン対象外のため、allowlist エントリ不要。
 */
export const vmReactImport: readonly AllowlistEntry[] = [] as const

/** domain/infrastructure での React import 除外ディレクトリ */
export const reactImportExcludeDirs: readonly AllowlistEntry[] = [
  {
    path: 'infrastructure/i18n',
    ruleId: 'AR-STRUCT-PURITY',
    reason: 'React Context を使用するため除外',
    category: 'structural',
    removalCondition: 'i18n が React 非依存になったとき',
    lifecycle: 'permanent',
    createdAt: '2026-04-08',
  },
] as const

/** useEffect 副作用チェーン許可（全件解消済み。凍結） */
export const sideEffectChain: readonly AllowlistEntry[] = [
  // useLoadComparisonData.ts: .then()/.catch() を async/await に変換済み
] as const
