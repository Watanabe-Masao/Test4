/**
 * データサマリーフック
 *
 * MonthlyData / ImportedData から各 Presentation コンポーネントが必要とする
 * サマリー情報を算出する。Presentation 層が .records を直接走査
 * することを防ぎ、全てのレコード走査をこのフック経由に集約する。
 */
import { useMemo } from 'react'
import type { DataType } from '@/domain/models/storeTypes'
import type { MonthlyData } from '@/domain/models/MonthlyData'
import { useDataStore } from '@/application/stores/dataStore'
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

const noTypes: ReadonlySet<DataType> = new Set()
const noMaxDay: ReadonlyMap<DataType, number> = new Map()
const noDays: ReadonlySet<number> = new Set()
const noStats: RecordSetStats = { recordCount: 0, storeCount: 0, dayRange: null }
const noOverview: readonly StoreDayStats[] = []

const defaultSummary: DataSummary = {
  hasAnyData: false,
  loadedTypes: noTypes,
  maxDayByType: noMaxDay,
  hasPrevYearData: false,
  prevYearDays: noDays,
  categoryTimeSalesStats: noStats,
  prevYearCategoryTimeSalesStats: noStats,
  dataOverview: noOverview,
}

function buildDataSummary(current: MonthlyData | null, prevYear: MonthlyData | null): DataSummary {
  if (!current) return defaultSummary

  const prevYearCS = prevYear?.classifiedSales
  const prevYearCTS = prevYear?.categoryTimeSales

  return {
    hasAnyData: computeHasAnyData(current),
    loadedTypes: computeLoadedTypes(current),
    maxDayByType: computeMaxDayByType(current),
    hasPrevYearData: (prevYearCS?.records?.length ?? 0) > 0,
    prevYearDays: prevYearCS?.records ? computeRecordDays(prevYearCS) : noDays,
    categoryTimeSalesStats: current.categoryTimeSales?.records
      ? computeCtsRecordStats(current.categoryTimeSales)
      : noStats,
    prevYearCategoryTimeSalesStats: prevYearCTS?.records
      ? computeCtsRecordStats(prevYearCTS)
      : noStats,
    dataOverview:
      current.purchase?.records && current.classifiedSales?.records
        ? buildDataOverview(current, prevYear)
        : noOverview,
  }
}

/**
 * store から currentMonthData / prevYear を読み取りサマリーを算出するフック。
 * 引数不要 — store state が変わった場合のみ再計算する。
 */
export function useDataSummary(): DataSummary {
  const current = useDataStore((s) => s.currentMonthData)
  const prevYear = useDataStore((s) => s.appData.prevYear)

  return useMemo(() => buildDataSummary(current, prevYear), [current, prevYear])
}
