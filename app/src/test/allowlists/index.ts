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
 *   size.ts         — ファイルサイズ（domain）
 *   migration.ts    — 比較移行（prevYear.daily, comparisonFrame.previous 等）
 *   misc.ts         — コンテキスト / React import 除外
 */

// Types & builders
export type {
  AllowlistEntry,
  AllowlistLifecycle,
  QuantitativeAllowlistEntry,
  RolloutCluster,
  DirectQueryClassification,
  DirectQueryAuditEntry,
} from './types'
export { buildAllowlistSet, buildQuantitativeAllowlist } from './types'

// Architecture
export { applicationToInfrastructure } from './architecture'

// DuckDB
export { presentationDuckdbHook } from './duckdb'

// Complexity
export {
  useMemoLimits,
  useStateLimits,
  hookLineLimits,
  presentationMemoLimits,
  presentationStateLimits,
  combinedHookComplexityLimits,
  featuresMemoLimits,
  featuresStateLimits,
} from './complexity'

// Size
export { domainLargeFiles } from './size'

// Migration
export { cmpPrevYearDaily, cmpFramePrevious, cmpDailyMapping } from './migration'

// Performance (Screen Runtime)
export { nonPairableConsumers } from './performance'

// Responsibility Separation
export {
  presentationGetStateLimits,
  moduleScopeLetLimits,
  domainModelExportLimits,
  STORE_IDS_NORMALIZATION_MAX_FILES,
  fallbackConstantDensityLimits,
} from './responsibility'

// Docs (文書品質 — コード品質とは分離管理)
export { DOC_STATIC_NUMBER_EXCEPTIONS } from './docs'
export type { DocStaticNumberException } from './docs'

// Misc
export { ctxHook, reactImportExcludeDirs } from './misc'

// Test Signal Integrity (G3 + TSIG-* family)
export {
  g3SuppressAllowlist,
  G3_SUPPRESS_PATH_SET,
  G3_SUPPRESS_MAX_ENTRIES,
} from './signalIntegrity'
