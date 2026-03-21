/**
 * FactorDecompositionPanel — 客数選択時の要因分解ウォーターフォール
 *
 * 日別売上差の要因内訳をウォーターフォールで表示。
 * 分解レベル切替（2/3/5要素）、サマリー行、PI値表示、計算式ヘルプ。
 * 既存 YoYWaterfallChart のサブコンポーネント群を再利用。
 */
import { useState, useMemo, memo } from 'react'
import styled from 'styled-components'
import type { AsyncDuckDBConnection } from '@duckdb/duckdb-wasm'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { DailyRecord } from '@/domain/models/record'
import type { CategoryTimeSalesRecord } from '@/domain/models/record'
import { useDuckDBCategoryTimeRecords } from '@/application/hooks/duckdb/useCtsHierarchyQueries'
import {
  calculateItemsPerCustomer,
  calculateAveragePricePerItem,
} from '@/domain/calculations/utils'
import { decomposePriceMix } from '@/presentation/pages/Dashboard/widgets/categoryFactorUtils'
import { buildFactorData } from '@/presentation/pages/Dashboard/widgets/YoYWaterfallChart.data'
import type { DecompLevel } from '@/presentation/pages/Dashboard/widgets/YoYWaterfallChart.data'
import {
  WaterfallBarChart,
  SalesSummaryRow,
  PISummaryRow,
  DecompHelpSection,
} from '@/presentation/pages/Dashboard/widgets/YoYWaterfallChart.subcomponents'
import {
  DecompRow,
  DecompBtn,
} from '@/presentation/pages/Dashboard/widgets/YoYWaterfallChart.styles'

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

const DECOMP_LABELS: Record<DecompLevel, string> = {
  2: '2要素',
  3: '3要素',
  5: '5要素',
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
  const [selectedLevel, setSelectedLevel] = useState<DecompLevel | null>(null)
  const [showHelp, setShowHelp] = useState(false)

  // 当月の集計
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
  const maxLevel: DecompLevel = priceMix ? 5 : hasQuantity ? 3 : 2
  const activeLevel: DecompLevel =
    selectedLevel != null && selectedLevel <= maxLevel ? selectedLevel : maxLevel
  const availableLevels: DecompLevel[] = maxLevel >= 5 ? [2, 3, 5] : maxLevel >= 3 ? [2, 3] : [2]

  // PI 値算出
  const curPI = calculateItemsPerCustomer(curTotalQty, curCust)
  const prevPI = calculateItemsPerCustomer(prevTotalQty, prevCust)
  const curPPI = calculateAveragePricePerItem(curSales, curTotalQty)
  const prevPPI = calculateAveragePricePerItem(prevSales, prevTotalQty)

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

  return (
    <PanelRoot>
      {/* サマリー行 */}
      <SalesSummaryRow prevLabel="前年" curLabel="当期" prevSales={prevSales} curSales={curSales} />

      {/* PI 値（3要素以上で点数データがある場合） */}
      {hasQuantity && (
        <PISummaryRow
          prevLabel="前年"
          curLabel="当期"
          prevPI={prevPI}
          curPI={curPI}
          prevPPI={prevPPI}
          curPPI={curPPI}
        />
      )}

      {/* 分解レベル切替 */}
      {availableLevels.length > 1 && (
        <DecompRow>
          {availableLevels.map((lv) => (
            <DecompBtn key={lv} $active={activeLevel === lv} onClick={() => setSelectedLevel(lv)}>
              {DECOMP_LABELS[lv]}
            </DecompBtn>
          ))}
        </DecompRow>
      )}

      {/* ウォーターフォール */}
      <WaterfallBarChart data={waterfallData} />

      {/* 計算式ヘルプ */}
      <DecompHelpSection
        showHelp={showHelp}
        onToggle={() => setShowHelp((p) => !p)}
        activeLevel={activeLevel}
      />
    </PanelRoot>
  )
})

// ── Styles ──

const NoData = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.colors.text4};
  padding: ${({ theme }) => theme.spacing[4]};
  font-size: 0.75rem;
`

const PanelRoot = styled.div`
  padding: ${({ theme }) => `${theme.spacing[2]} 0`};
`
