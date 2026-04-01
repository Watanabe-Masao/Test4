/**
 * useComparisonInput — 比較分析の入力を一元取得する facade
 *
 * 比較関連のデータ取得を集約し、ComparisonScope の唯一入口を保証する。
 * presentation 層が appData.prevYear を直接読むのを防ぐ。
 *
 * @layer Application — facade hook
 */
import { useDataStore } from '@/application/stores/dataStore'
import type { MonthlyData } from '@/domain/models/MonthlyData'
import type { ComparisonScope } from '@/domain/models/ComparisonScope'

export interface ComparisonInput {
  /** 前年データ（null = 未ロード） */
  readonly prevYear: MonthlyData | null
  /** 比較データ version（cache invalidation 用） */
  readonly comparisonDataVersion: number
}

/**
 * 比較分析の入力を一元取得する。
 *
 * ComparisonScope の構築は useComparisonModule が担う。
 * この facade は raw data の取得口としてのみ機能する。
 */
export function useComparisonInput(): ComparisonInput {
  const prevYear = useDataStore((s) => s.appData.prevYear)
  const comparisonDataVersion = useDataStore((s) => s.comparisonDataVersion)

  return { prevYear, comparisonDataVersion }
}

// Re-export for convenience
export type { ComparisonScope }
