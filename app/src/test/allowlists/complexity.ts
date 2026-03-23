/**
 * ガードテスト許可リスト — 複雑性（useMemo / useState / hook 行数）
 */
import type { QuantitativeAllowlistEntry } from './types'

/** useMemo 上限の個別例外 */
export const useMemoLimits: readonly QuantitativeAllowlistEntry[] = [
  {
    path: 'application/hooks/useComparisonModule.ts',
    reason: 'comparison 層の集約 hook。分割は過剰',
    category: 'structural',
    removalCondition: '比較モジュールのリファクタリング時',
    limit: 8,
  },
] as const

/** useState 上限の個別例外 */
export const useStateLimits: readonly QuantitativeAllowlistEntry[] = [
  {
    path: 'application/hooks/usePersistence.ts',
    reason: '永続化ステートの管理',
    category: 'structural',
    removalCondition: 'persistence hook のリファクタリング時',
    limit: 7,
  },
  {
    path: 'application/hooks/useAutoBackup.ts',
    reason: '自動バックアップのステート管理',
    category: 'structural',
    removalCondition: 'backup hook のリファクタリング時',
    limit: 7,
  },
] as const

/** hook ファイル行数上限の個別例外 */
export const hookLineLimits: readonly QuantitativeAllowlistEntry[] = [
  {
    path: 'application/hooks/duckdb/categoryBenchmarkLogic.ts',
    reason: 'DuckDB ベンチマーク計算ロジック',
    category: 'structural',
    removalCondition: 'ロジック分割時',
    limit: 450,
  },
  {
    path: 'application/hooks/usePeriodAwareKpi.ts',
    reason: '期間対応 KPI hook',
    category: 'structural',
    removalCondition: 'KPI hook のリファクタリング時',
    limit: 310,
  },
] as const
