/**
 * FactorDecompositionPanel — 客数選択時の要因分解ウォーターフォール
 *
 * 日別売上差の要因内訳を5要素分解で表示。
 * 既存 YoYWaterfallChart のサブコンポーネント群を再利用。
 */
import { useMemo, memo } from 'react'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { DailyRecord } from '@/domain/models/record'
import { useDuckDBCategoryTimeRecords } from '@/application/hooks/duckdb/useCtsHierarchyQueries'
import { decomposePriceMix } from '@/presentation/pages/Dashboard/widgets/categoryFactorUtils'
import { buildFactorData } from '@/presentation/pages/Dashboard/widgets/YoYWaterfallChart.data'
import type { DecompLevel } from '@/presentation/pages/Dashboard/widgets/YoYWaterfallChart.data'
import { WaterfallBarChart } from '@/presentation/pages/Dashboard/widgets/YoYWaterfallChart.subcomponents'
import { formatCurrency } from '@/domain/formatting'
import type { CategoryTimeSalesRecord } from '@/domain/models/record'

const EMPTY_CTS: readonly CategoryTimeSalesRecord[] = []

interface Props {
  readonly daily: ReadonlyMap<number, DailyRecord>
  readonly daysInMonth: number
  readonly prevYearDaily?: ReadonlyMap<
    string,
    { sales: number; discount: number; customers?: number }
  >
  readonly duckConn: AsyncDuckDBConnection | null
  readonly duckDataVersion: number
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  readonly prevYearScope?: PrevYearScope
}

export const FactorDecompositionPanel = memo(function FactorDecompositionPanel({
  daily,
  daysInMonth,
  prevYearDaily,
  duckConn,
  duckDataVersion,
  currentDateRange,
  selectedStoreIds,
  prevYearScope,
}: Props) {
  // 当月の集計（DailyRecord には quantity がないため qty=0）
  const { curSales, curCust } = useMemo(() => {
    let sales = 0
    let cust = 0
    for (let d = 1; d <= daysInMonth; d++) {
      const rec = daily.get(d)
      if (rec) {
        sales += rec.sales
        cust += rec.customers ?? 0
      }
    }
    return { curSales: sales, curCust: cust }
  }, [daily, daysInMonth])

  // 前年の集計
  const { prevSales, prevCust, hasComparison } = useMemo(() => {
    if (!prevYearDaily || prevYearDaily.size === 0) {
      return { prevSales: 0, prevCust: 0, hasComparison: false }
    }
    let sales = 0
    let cust = 0
    for (const [, rec] of prevYearDaily) {
      sales += rec.sales
      cust += rec.customers ?? 0
    }
    return { prevSales: sales, prevCust: cust, hasComparison: sales > 0 }
  }, [prevYearDaily])

  // CTS データ（5要素分解用）
  const curCTS = useDuckDBCategoryTimeRecords(
    duckConn,
    duckDataVersion,
    currentDateRange,
    selectedStoreIds,
  )
  const prevDateRange = prevYearScope?.dateRange
  const prevCTS = useDuckDBCategoryTimeRecords(
    duckConn,
    duckDataVersion,
    prevDateRange,
    selectedStoreIds,
    true,
  )

  const periodCTS = useMemo(() => curCTS.data ?? EMPTY_CTS, [curCTS.data])
  const periodPrevCTS = useMemo(() => prevCTS.data ?? EMPTY_CTS, [prevCTS.data])

  // CTS から数量を集計
  const { curTotalQty, prevTotalQty } = useMemo(() => {
    let curQ = 0
    let prevQ = 0
    for (const r of periodCTS) curQ += r.totalQuantity ?? 0
    for (const r of periodPrevCTS) prevQ += r.totalQuantity ?? 0
    return { curTotalQty: curQ, prevTotalQty: prevQ }
  }, [periodCTS, periodPrevCTS])

  // 分解レベル判定
  const priceMix = useMemo(() => {
    if (periodCTS.length === 0 || periodPrevCTS.length === 0) return null
    return decomposePriceMix(periodCTS, periodPrevCTS)
  }, [periodCTS, periodPrevCTS])

  const hasQuantity = curTotalQty > 0 && prevTotalQty > 0
  const activeLevel: DecompLevel = priceMix ? 5 : hasQuantity ? 3 : 2

  // ウォーターフォールデータ構築
  const waterfallData = useMemo(
    () =>
      buildFactorData({
        hasComparison,
        prevSales,
        curSales,
        prevCust,
        curCust,
        hasQuantity,
        curTotalQty,
        prevTotalQty,
        priceMix,
        activeLevel,
        periodCTS,
        periodPrevCTS,
        prevLabel: '前年',
        curLabel: '当期',
      }),
    [
      hasComparison,
      prevSales,
      curSales,
      prevCust,
      curCust,
      hasQuantity,
      curTotalQty,
      prevTotalQty,
      priceMix,
      activeLevel,
      periodCTS,
      periodPrevCTS,
    ],
  )

  if (!hasComparison || waterfallData.length === 0) {
    return <NoData>比較データがありません</NoData>
  }

  const delta = curSales - prevSales
  const sign = delta >= 0 ? '+' : ''

  return (
    <div>
      <Summary>
        前年売上差:{' '}
        <DeltaValue $positive={delta >= 0}>
          {sign}
          {formatCurrency(delta)}
        </DeltaValue>
        （{activeLevel}要素分解）
      </Summary>
      <WaterfallBarChart data={waterfallData} />
    </div>
  )
})

// ── Styles ──

import styled from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'

const NoData = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.colors.text4};
  padding: ${({ theme }) => theme.spacing[4]};
  font-size: 0.75rem;
`

const Summary = styled.div`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.text3};
  padding: ${({ theme }) => `${theme.spacing[1]} ${theme.spacing[2]}`};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

const DeltaValue = styled.span<{ $positive: boolean }>`
  font-weight: 600;
  color: ${({ $positive }) => ($positive ? sc.positive : sc.negative)};
`
