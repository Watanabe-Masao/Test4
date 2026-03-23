/**
 * ガードテスト許可リスト — その他（VM React / コンテキスト / 副作用チェーン / 凍結済み）
 */
import type { AllowlistEntry } from './types'

/** DOW 計算オーバーライド許可（全件解消済み。凍結） */
export const dowCalcOverride: readonly AllowlistEntry[] = [] as const

/** コンテキスト hook 許可 */
export const ctxHook: readonly AllowlistEntry[] = [
  {
    path: 'presentation/hooks/useUnifiedWidgetContext.ts',
    reason: 'ウィジェット統合コンテキスト',
    category: 'structural',
    removalCondition: 'コンテキスト設計見直し時',
  },
  {
    path: 'presentation/pages/Dashboard/widgets/EtrnTestWidget.tsx',
    reason: 'ETRN テストウィジェット',
    category: 'legacy',
    removalCondition: 'テストウィジェット廃止時',
  },
] as const

/** VM ファイルでの React import 許可 */
export const vmReactImport: readonly AllowlistEntry[] = [
  {
    path: 'presentation/components/charts/CategoryBenchmarkChart.vm.ts',
    reason: 'Recharts ResponsiveContainer 等が必要',
    category: 'structural',
    removalCondition: 'Recharts 依存が VM から分離されたとき',
  },
  {
    path: 'presentation/components/charts/CategoryBoxPlotChart.vm.ts',
    reason: 'Recharts ResponsiveContainer 等が必要',
    category: 'structural',
    removalCondition: 'Recharts 依存が VM から分離されたとき',
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
