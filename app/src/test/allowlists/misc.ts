/**
 * ガードテスト許可リスト — その他（VM React / コンテキスト / 副作用チェーン / 凍結済み）
 */
import type { AllowlistEntry } from './types'

/** DOW 計算オーバーライド許可（全件解消済み。凍結） */
export const dowCalcOverride: readonly AllowlistEntry[] = [] as const

/** ctx 提供データの重複取得許可（useWeatherData 等を ctx 経由ではなく直接 import する例外） */
export const ctxHook: readonly AllowlistEntry[] = [
  {
    path: 'presentation/hooks/useUnifiedWidgetContext.ts',
    reason: 'ctx 自体の構築元。useWeatherData を直接 import して ctx に供給する',
    category: 'structural',
    removalCondition: 'コンテキスト設計見直し時',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/EtrnTestWidget.tsx',
    reason: 'ETRN テストウィジェット。ctx 非経由で直接データ取得（デバッグ用途で維持）',
    category: 'structural',
    removalCondition: 'テストウィジェット廃止時',
  },
] as const

/** VM ファイルでの React import 許可 */
export const vmReactImport: readonly AllowlistEntry[] = [
  {
    path: 'presentation/components/charts/CategoryBenchmarkChart.vm.ts',
    reason: 'VM 内で useState/useMemo を使用',
    category: 'structural',
    removalCondition: 'React hooks が VM から分離されたとき',
  },
  {
    path: 'presentation/components/charts/CategoryBoxPlotChart.vm.ts',
    reason: 'VM 内で useState/useMemo を使用',
    category: 'structural',
    removalCondition: 'React hooks が VM から分離されたとき',
  },
] as const

/** domain/infrastructure での React import 除外ディレクトリ */
export const reactImportExcludeDirs: readonly AllowlistEntry[] = [
  {
    path: 'infrastructure/i18n',
    reason: 'React Context を使用するため除外',
    category: 'structural',
    removalCondition: 'i18n が React 非依存になったとき',
  },
] as const

/** useEffect 副作用チェーン許可 */
export const sideEffectChain: readonly AllowlistEntry[] = [
  {
    path: 'application/hooks/useLoadComparisonData.ts',
    reason: '.then() 2行のみ — 分離は過剰',
    category: 'structural',
    removalCondition: '副作用チェーンが増えたとき',
  },
] as const
