/**
 * usePrevYearMonthlyKpi — 前年月間KPI（同曜日 + 同日）
 *
 * 有効取り込み期間（dataEndDay）に依存しない月間フル集計を提供する。
 * 同曜日アライメントと同日アライメントの両方を同時に返す。
 *
 * 用途: ダッシュボードKPIカードで前年同曜日/同日の月間売上・客数を常時表示。
 *       カード根拠クリックで日別対応テーブル（前年売上 vs 当年予算）を表示。
 */
import { useMemo } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { usePeriodSelectionStore } from '@/application/stores/periodSelectionStore'
import { useStoreSelection } from './useStoreSelection'
import { getDaysInMonth } from '@/domain/constants/defaults'
import { aggregateAllStores, indexByStoreDay } from '@/domain/models'
import type { StoreDayIndex, SpecialSalesDayEntry } from '@/domain/models'
import { calculateTransactionValue } from '@/domain/calculations/utils'
import { calcSameDowOffset } from '@/application/comparison/resolveComparisonFrame'

/** 日別マッピング行: 前年の1日 → 当年の対応日 */
export interface DayMappingRow {
  /** 前年の日番号 */
  readonly prevDay: number
  /** 当年の対応日番号 */
  readonly currentDay: number
  /** 前年売上 */
  readonly prevSales: number
  /** 前年客数 */
  readonly prevCustomers: number
}

/** 店舗×日別の計算根拠（aggregateWithOffset が自然に得る情報を捨てずに返す） */
export interface StoreContribution {
  readonly storeId: string
  /** 前年の実日付（日番号） */
  readonly originalDay: number
  /** 当年の対応日番号 */
  readonly mappedDay: number
  readonly sales: number
  readonly customers: number
}

export interface PrevYearMonthlyKpiEntry {
  readonly sales: number
  readonly customers: number
  readonly transactionValue: number
  /** 日別マッピング（prevDay → currentDay + 前年売上・客数） */
  readonly dailyMapping: readonly DayMappingRow[]
  /** 店舗×日別の計算根拠（Explanation の evidenceRefs 構築に使用） */
  readonly storeContributions: readonly StoreContribution[]
}

export interface PrevYearMonthlyKpi {
  readonly hasPrevYear: boolean
  /** 前年同曜日: 月間フル集計 */
  readonly sameDow: PrevYearMonthlyKpiEntry
  /** 前年同日: 月間フル集計 */
  readonly sameDate: PrevYearMonthlyKpiEntry
  /** 前年データ元の年 */
  readonly sourceYear: number
  /** 前年データ元の月 */
  readonly sourceMonth: number
  /** 同曜日オフセット (0-6) */
  readonly dowOffset: number
}

const ZERO_ENTRY: PrevYearMonthlyKpiEntry = {
  sales: 0,
  customers: 0,
  transactionValue: 0,
  dailyMapping: [],
  storeContributions: [],
}
const EMPTY: PrevYearMonthlyKpi = {
  hasPrevYear: false,
  sameDow: ZERO_ENTRY,
  sameDate: ZERO_ENTRY,
  sourceYear: 0,
  sourceMonth: 0,
  dowOffset: 0,
}

/**
 * 指定オフセットで前年日別データを当年月にマッピングし、月間合計と日別マッピングを返す。
 */
/** @visibleForTesting */
export function aggregateWithOffset(
  allAgg: Record<string, Record<string, { sales?: number; discount?: number }>>,
  prevYearFlowersIndex: StoreDayIndex<SpecialSalesDayEntry> | undefined,
  targetIds: readonly string[],
  offset: number,
  daysInTargetMonth: number,
): PrevYearMonthlyKpiEntry {
  let totalSales = 0
  let totalCustomers = 0
  // currentDay をキーに日別データを蓄積
  const dayMap = new Map<number, { prevDay: number; sales: number; customers: number }>()
  // 店舗×日別の計算根拠（計算中に自然に得られる情報を捨てずに保持）
  const storeContributions: StoreContribution[] = []

  for (const storeId of targetIds) {
    const storeDays = allAgg[storeId]
    if (!storeDays) continue
    for (const [dayStr, summary] of Object.entries(storeDays)) {
      const origDay = Number(dayStr)
      if (isNaN(origDay)) continue
      const mappedDay = origDay - offset
      if (mappedDay < 1 || mappedDay > daysInTargetMonth) continue

      const sales = summary.sales ?? 0
      totalSales += sales
      const flowerEntry = prevYearFlowersIndex?.[storeId]?.[origDay]
      const customers = flowerEntry?.customers ?? 0
      totalCustomers += customers

      storeContributions.push({ storeId, originalDay: origDay, mappedDay, sales, customers })

      const existing = dayMap.get(mappedDay)
      if (existing) {
        existing.sales += sales
        existing.customers += customers
      } else {
        dayMap.set(mappedDay, { prevDay: origDay, sales, customers })
      }
    }
  }

  // currentDay 昇順でソート
  const dailyMapping: DayMappingRow[] = Array.from(dayMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([currentDay, d]) => ({
      prevDay: d.prevDay,
      currentDay,
      prevSales: d.sales,
      prevCustomers: d.customers,
    }))

  return {
    sales: totalSales,
    customers: totalCustomers,
    transactionValue: calculateTransactionValue(totalSales, totalCustomers),
    dailyMapping,
    storeContributions,
  }
}

export function usePrevYearMonthlyKpi(): PrevYearMonthlyKpi {
  const data = useDataStore((s) => s.data)
  const settings = useSettingsStore((s) => s.settings)
  const { selectedStoreIds, isAllStores } = useStoreSelection()

  const prevYearCS = data.prevYearClassifiedSales
  const prevYearFlowers = data.prevYearFlowers
  const { targetYear, targetMonth } = settings
  const periodSelection = usePeriodSelectionStore((s) => s.selection)

  return useMemo(() => {
    if (prevYearCS.records.length === 0) return EMPTY

    const allAgg = aggregateAllStores(prevYearCS)
    const allStoreIds = Object.keys(allAgg)
    if (allStoreIds.length === 0) return EMPTY

    const targetIds = isAllStores
      ? allStoreIds
      : allStoreIds.filter((id) => selectedStoreIds.has(id))
    if (targetIds.length === 0) return EMPTY

    const daysInTargetMonth = getDaysInMonth(targetYear, targetMonth)
    if (isNaN(daysInTargetMonth) || daysInTargetMonth <= 0) return EMPTY

    // ソース年月 — periodSelection.period2 から取得
    const srcYear = periodSelection.period2.from.year
    const srcMonth = periodSelection.period2.from.month

    // 同曜日オフセット — 常に算出する（preset に依存しない）
    // sameDow KPI は常に曜日寄せの値を表示するため
    const dowOffset = calcSameDowOffset(targetYear, targetMonth, srcYear, srcMonth)

    // flat records → index 変換
    const flowersIndex =
      prevYearFlowers.records.length > 0 ? indexByStoreDay(prevYearFlowers.records) : undefined

    const sameDow = aggregateWithOffset(
      allAgg,
      flowersIndex,
      targetIds,
      dowOffset,
      daysInTargetMonth,
    )
    const sameDate = aggregateWithOffset(allAgg, flowersIndex, targetIds, 0, daysInTargetMonth)

    return {
      hasPrevYear: true,
      sameDow,
      sameDate,
      sourceYear: srcYear,
      sourceMonth: srcMonth,
      dowOffset,
    }
  }, [
    prevYearCS,
    prevYearFlowers,
    selectedStoreIds,
    isAllStores,
    targetYear,
    targetMonth,
    periodSelection,
  ])
}
