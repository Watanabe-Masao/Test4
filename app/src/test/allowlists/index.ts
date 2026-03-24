/**
 * ガードテスト許可リスト — バレル re-export
 *
 * 全ガードテストの許可リストをメタデータ付きで管理する。
 * 各エントリには理由・カテゴリ・削除条件を記載し、
 * 「許可リストが不要になる構造」を目指す（CLAUDE.md §ガードテスト許可リスト参照）。
 *
 * ガードファミリ別にファイル分割されている:
 *   types.ts        — 型定義・ビルダー関数
 *   architecture.ts — 層境界（application→infra, presentation→usecases 等）
 *   duckdb.ts       — DuckDB hook 直接使用（全件卒業済み・凍結）
 *   complexity.ts   — useMemo / useState / hook 行数の個別例外
 *   size.ts         — ファイルサイズ（大型コンポーネント / infra / domain / usecases）
 *   migration.ts    — 比較移行（prevYear.daily, comparisonFrame.previous 等）
 *   misc.ts         — VM React import / コンテキスト / 副作用チェーン / 凍結済み
 */

// Types & builders
export type { AllowlistEntry, QuantitativeAllowlistEntry } from './types'
export { buildAllowlistSet, buildQuantitativeAllowlist } from './types'

// Architecture
export {
  applicationToInfrastructure,
  presentationToInfrastructure,
  infrastructureToApplication,
  presentationToUsecases,
} from './architecture'

// DuckDB
export { presentationDuckdbHook } from './duckdb'

// Complexity
export {
  useMemoLimits,
  useStateLimits,
  hookLineLimits,
  presentationMemoLimits,
  presentationStateLimits,
} from './complexity'

// Size
export { largeComponentTier2, infraLargeFiles, domainLargeFiles, usecasesLargeFiles } from './size'

// Migration
export { cmpPrevYearDaily, cmpFramePrevious, cmpDailyMapping } from './migration'

// Misc
export {
  dowCalcOverride,
  ctxHook,
  vmReactImport,
  reactImportExcludeDirs,
  sideEffectChain,
} from './misc'
