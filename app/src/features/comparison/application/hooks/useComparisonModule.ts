/**
 * useComparisonModule — 比較サブシステムの facade (features/ 内)
 *
 * phase-6-optional-comparison-projection Phase O5:
 * features/comparison/ 内部では PeriodSelection を知らない。
 * このファイルは ComparisonModule 型定義 + useComparisonModuleCore の re-export。
 *
 * 旧 signature (`periodSelection, elapsedDays, ...`) の wrapper は
 * app/src/application/hooks/useComparisonModule.ts に配置されている。
 *
 * @responsibility R:unclassified
 */
import type { ComparisonScope, PrevYearScope } from '@/domain/models/ComparisonScope'
import type { ComparisonLoadStatus } from '@/application/hooks/useLoadComparisonData'
import type {
  PrevYearData,
  PrevYearMonthlyKpi,
} from '@/features/comparison/application/comparisonTypes'
import type { DowGapAnalysis } from '@/domain/models/ComparisonContext'

// ── 出力型 ──

/** useComparisonModule の出力 — 比較サブシステムの唯一のインターフェース */
export interface ComparisonModule {
  /** 比較スコープ（比較OFF or periodSelection 未確定なら null） */
  readonly scope: ComparisonScope | null
  /** データ読込状態 */
  readonly loadStatus: ComparisonLoadStatus
  /** 日別比較データ（旧 PrevYearData 互換） */
  readonly daily: PrevYearData
  /** 月間KPI（旧 PrevYearMonthlyKpi 互換） */
  readonly kpi: PrevYearMonthlyKpi
  /** 曜日ギャップ分析 */
  readonly dowGap: DowGapAnalysis
  /** 前年スコープ（DuckDB日付範囲 + 客数 + dowOffset） */
  readonly prevYearScope: PrevYearScope | undefined
}

// ── Core hook re-export ──

export { useComparisonModuleCore } from './useComparisonModuleCore'
export type { UseComparisonModuleCoreInput } from './useComparisonModuleCore'
