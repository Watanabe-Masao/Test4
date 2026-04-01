/**
 * useAnalysisInput — 計算・分析ロジックの入力を一元取得する facade
 *
 * 計算パイプラインが store を直接参照するのを防ぎ、
 * 将来の AnalysisFrame 拡張時の差し替え口を提供する。
 *
 * @layer Application — facade hook
 */
import { useMemo } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import type { MonthlyData } from '@/domain/models/MonthlyData'
import type { AppSettings } from '@/domain/models/storeTypes'
import type { CalculationFrame } from '@/domain/models/CalculationFrame'
import { buildCalculationFrame } from '@/domain/models/CalculationFrame'

export interface AnalysisInput {
  /** 当月データ（null = 未ロード） */
  readonly data: MonthlyData | null
  /** 計算条件（期間・有効日数） */
  readonly frame: CalculationFrame
  /** アプリケーション設定 */
  readonly settings: AppSettings
  /** 当月データ version（cache invalidation 用） */
  readonly dataVersion: number
}

/**
 * 計算・分析ロジックの入力を一元取得する。
 *
 * store 直読みの代わりにこの facade を使うことで、
 * 将来の AnalysisFrame 拡張や入力契約変更を 1 箇所に集約する。
 */
export function useAnalysisInput(): AnalysisInput {
  const data = useDataStore((s) => s.currentMonthData)
  const dataVersion = useDataStore((s) => s.authoritativeDataVersion)
  const settings = useSettingsStore((s) => s.settings)
  const frame = useMemo(() => buildCalculationFrame(settings), [settings])

  return useMemo(
    () => ({ data, frame, settings, dataVersion }),
    [data, frame, settings, dataVersion],
  )
}
