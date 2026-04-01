/**
 * データサマリーフック
 *
 * ImportedData から各 Presentation コンポーネントが必要とする
 * サマリー情報を算出する。Presentation 層が .records を直接走査
 * することを防ぎ、全てのレコード走査をこのフック経由に集約する。
 */
import { useMemo } from 'react'
import type { ImportedData, DataType } from '@/domain/models/storeTypes'
import type { MonthlyData } from '@/domain/models/MonthlyData'
import {
  computeHasAnyData,
  computeLoadedTypes,
  computeMaxDayByType,
  computeCtsRecordStats,
  computeRecordDays,
  buildDataOverview,
  type RecordSetStats,
  type StoreDayStats,
} from '@/application/services/dataSummary'

export interface DataSummary {
  /** データが存在するか（NavBar 用） */
  readonly hasAnyData: boolean
  /** ロード済みデータ種別一覧（DataManagementSidebar 用） */
  readonly loadedTypes: ReadonlySet<DataType>
  /** データ種別ごとの最大日（DataManagementSidebar 用） */
  readonly maxDayByType: ReadonlyMap<DataType, number>
  /** 前年データが存在するか（PrevYearMappingTab 用） */
  readonly hasPrevYearData: boolean
  /** 前年分類別売上のデータ存在日（PrevYearMappingTab 用） */
  readonly prevYearDays: ReadonlySet<number>
  /** 分類別時間帯売上の統計（ImportHistoryTab 用） */
  readonly categoryTimeSalesStats: RecordSetStats
  /** 前年分類別時間帯売上の統計（ImportHistoryTab 用） */
  readonly prevYearCategoryTimeSalesStats: RecordSetStats
  /** 全データタイプの概要（ImportHistoryTab 用） */
  readonly dataOverview: readonly StoreDayStats[]
}

export type { RecordSetStats, StoreDayStats }

/**
 * ImportedData からサマリー情報を算出するフック。
 * data 参照が変わった場合のみ再計算する。
 * prevYear は AppData.prevYear（MonthlyData）から供給する。
 */
export function useDataSummary(data: ImportedData, prevYear?: MonthlyData | null): DataSummary {
  return useMemo(() => {
    const hasAnyData = computeHasAnyData(data)
    const loadedTypes = computeLoadedTypes(data)
    const maxDayByType = computeMaxDayByType(data)
    const prevYearCS = prevYear?.classifiedSales
    const hasPrevYearData = (prevYearCS?.records?.length ?? 0) > 0
    const prevYearDays = prevYearCS?.records ? computeRecordDays(prevYearCS) : new Set<number>()
    const categoryTimeSalesStats = data.categoryTimeSales?.records
      ? computeCtsRecordStats(data.categoryTimeSales)
      : { recordCount: 0, storeCount: 0, dayRange: null }
    const prevYearCTS = prevYear?.categoryTimeSales
    const prevYearCategoryTimeSalesStats = prevYearCTS?.records
      ? computeCtsRecordStats(prevYearCTS)
      : { recordCount: 0, storeCount: 0, dayRange: null }
    const dataOverview =
      data.purchase?.records && data.classifiedSales?.records ? buildDataOverview(data) : []

    return {
      hasAnyData,
      loadedTypes,
      maxDayByType,
      hasPrevYearData,
      prevYearDays,
      categoryTimeSalesStats,
      prevYearCategoryTimeSalesStats,
      dataOverview,
    }
  }, [data, prevYear])
}
