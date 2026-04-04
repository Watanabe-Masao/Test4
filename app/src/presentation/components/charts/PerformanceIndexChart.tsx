import { useCallback, useState, useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { EChart } from './EChart'
import { useChartTheme, toComma, toPct } from './chartTheme'
import { CHART_GUIDES } from './chartGuides'
import { ChartCard } from './ChartCard'
import type { DailyRecord } from '@/domain/models/record'
import {
  ViewToggle,
  ViewBtn,
  StatsRow,
  StatChip,
  AnomalyNote,
} from './PerformanceIndexChart.styles'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import type { StoreResult } from '@/domain/models/StoreResult'
import type { Store } from '@/domain/models/Store'
import {
  buildPerformanceData,
  buildPerformanceOption,
  type ViewType,
} from './PerformanceIndexChart.builders'
import { CategoryPerformanceChart, type CategoryLevelType } from '@/features/category'
import { StorePIComparisonChart, type StorePILevel } from './StorePIComparisonChart'
import { usePerformanceIndexPlan } from '@/application/hooks/usePerformanceIndexPlan'

const VIEW_LABELS: Record<ViewType, string> = {
  piAmount: '金額PI',
  piQuantity: '点数PI',
  deviation: '偏差値',
  zScore: 'Zスコア',
}

interface Props {
  daily: ReadonlyMap<number, DailyRecord>
  daysInMonth: number
  year: number
  month: number
  prevYearDaily?: ReadonlyMap<
    string,
    { sales: number; discount: number; customers?: number; ctsQuantity?: number }
  >
  /** 日クリック時コールバック（異常値バーのクリックでナビゲーション） */
  onDayClick?: (day: number) => void
  /** DuckDB 接続（カテゴリPI値ランキング子チャート用） */
  queryExecutor?: QueryExecutor | null
  currentDateRange?: DateRange
  prevYearScope?: PrevYearScope
  selectedStoreIds?: ReadonlySet<string>
  totalCustomers?: number
  /** 店舗別PI値比較用 */
  allStoreResults?: ReadonlyMap<string, StoreResult>
  stores?: ReadonlyMap<string, Store>
  /** 日別販売点数データ（CTS 由来、点数PI計算用） */
  dailyQuantity?: ReadonlyMap<number, number>
}

const EMPTY_PREV_YEAR: ReadonlyMap<
  string,
  { sales: number; discount: number; customers?: number }
> = new Map()

export const PerformanceIndexChart = memo(function PerformanceIndexChart({
  daily,
  daysInMonth,
  year,
  month,
  prevYearDaily,
  onDayClick,
  queryExecutor,
  currentDateRange,
  prevYearScope,
  selectedStoreIds,
  totalCustomers,
  allStoreResults,
  stores,
  dailyQuantity,
}: Props) {
  const ct = useChartTheme()
  const theme = useTheme() as AppTheme
  const [view, setView] = useState<ViewType>('piAmount')
  // 範囲選択状態（子チャートに期間を渡す用）
  const [selectedRange, setSelectedRange] = useState<{ from: number; to: number } | null>(null)
  // 子チャートの階層レベル状態（plan hook に渡す）
  const [categoryLevel, setCategoryLevel] = useState<CategoryLevelType>('department')
  const [storePILevel, setStorePILevel] = useState<StorePILevel>('department')
  const { chartData, stats, piMa7, prevPiMa7, qtyPiMa7, prevQtyPiMa7 } = useMemo(
    () =>
      buildPerformanceData(
        daily,
        daysInMonth,
        year,
        month,
        prevYearDaily ?? EMPTY_PREV_YEAR,
        dailyQuantity,
      ),
    [daily, daysInMonth, year, month, prevYearDaily, dailyQuantity],
  )

  const data = chartData.map((d, i) => ({
    ...d,
    piMa7: piMa7[i],
    prevPiMa7: prevPiMa7[i],
    qtyPiMa7: qtyPiMa7[i],
    prevQtyPiMa7: prevQtyPiMa7[i],
  }))

  const hasAnomalies = useMemo(
    () => data.some((d) => d.salesZ != null && Math.abs(d.salesZ) >= 2),
    [data],
  )

  const titleMap: Record<ViewType, string> = {
    piAmount: 'PI値分析（金額PI = 売上÷客数×1000 / 7日移動平均）',
    piQuantity: 'PI値分析（点数PI = 点数÷客数×1000 / 7日移動平均）',
    deviation: '偏差値分析（各指標の日別偏差値 / 基準=50）',
    zScore: 'Zスコア分析（平均=0からの乖離度 / |Z|≥2 で異常値）',
  }

  const handleClick = useCallback(
    (params: Record<string, unknown>) => {
      if (!onDayClick || view !== 'zScore') return
      const dataIndex = params.dataIndex as number | undefined
      if (dataIndex == null) return
      const entry = data[dataIndex]
      if (entry && entry.salesZ != null && Math.abs(entry.salesZ) >= 2) {
        onDayClick(entry.day)
      }
    },
    [onDayClick, view, data],
  )

  // バークリックで範囲選択（1日分）
  const handleBarClick = useCallback(
    (params: Record<string, unknown>) => {
      if (view === 'zScore' && onDayClick) {
        handleClick(params)
        return
      }
      const dataIndex = params.dataIndex as number | undefined
      if (dataIndex == null) return
      const entry = data[dataIndex]
      if (!entry) return
      setSelectedRange({ from: entry.day, to: entry.day })
    },
    [view, data, onDayClick, handleClick],
  )

  // ブラシ選択で範囲選択
  const handleBrushEnd = useCallback(
    (params: Record<string, unknown>) => {
      const areas = (params as { areas?: { coordRange?: number[] }[] }).areas
      if (!areas || areas.length === 0) return
      const range = areas[0].coordRange
      if (!range || range.length < 2) return
      const startIdx = Math.max(0, Math.min(range[0], range[1]))
      const endIdx = Math.min(data.length - 1, Math.max(range[0], range[1]))
      const fromDay = data[startIdx]?.day
      const toDay = data[endIdx]?.day
      if (fromDay != null && toDay != null) {
        setSelectedRange({ from: fromDay, to: toDay })
      }
    },
    [data],
  )

  // 子チャートに渡す期間（選択範囲があればそれ、なければ月全体）
  const childDateRange = useMemo((): DateRange | undefined => {
    if (!currentDateRange) return undefined
    if (!selectedRange) return currentDateRange
    return {
      from: { year, month, day: selectedRange.from },
      to: { year, month, day: selectedRange.to },
    }
  }, [currentDateRange, selectedRange, year, month])

  // Screen Plan: 子チャートの DuckDB クエリを一元管理
  const plan = usePerformanceIndexPlan({
    executor: queryExecutor ?? null,
    categoryDateRange: childDateRange ?? currentDateRange!,
    currentDateRange: currentDateRange!,
    prevYearScope,
    selectedStoreIds: selectedStoreIds ?? new Set(),
    categoryLevel,
    storePILevel,
  })

  const option = useMemo(
    () => buildPerformanceOption(data, view, ct, theme),
    [data, view, ct, theme],
  )

  return (
    <ChartCard
      title={titleMap[view]}
      guide={CHART_GUIDES['performance-index']}
      ariaLabel="業績指数チャート"
      toolbar={
        <ViewToggle>
          {(Object.keys(VIEW_LABELS) as ViewType[]).map((v) => (
            <ViewBtn key={v} $active={view === v} onClick={() => setView(v)}>
              {VIEW_LABELS[v]}
            </ViewBtn>
          ))}
        </ViewToggle>
      }
    >
      {view === 'deviation' && (
        <StatsRow>
          <StatChip $color={ct.semantic.sales}>
            売上 平均:{toComma(stats.sales.mean)} σ:{toComma(stats.sales.stdDev)}
          </StatChip>
          <StatChip $color={ct.semantic.customers}>
            客数 平均:{toComma(stats.cust.mean)} σ:{toComma(stats.cust.stdDev)}
          </StatChip>
          <StatChip $color={ct.semantic.transactionValue}>
            客単価 平均:{toComma(stats.tx.mean)} σ:{toComma(stats.tx.stdDev)}
          </StatChip>
          <StatChip $color={ct.semantic.discount}>
            売変率 平均:{toPct(stats.disc.mean)} σ:{toPct(stats.disc.stdDev)}
          </StatChip>
          <StatChip $color={ct.semantic.grossProfitRate}>
            粗利率 平均:{toPct(stats.gp.mean)} σ:{toPct(stats.gp.stdDev)}
          </StatChip>
        </StatsRow>
      )}

      {selectedRange && (
        <div
          style={{
            fontSize: ct.fontSize.body + 1,
            color: ct.text,
            marginBottom: 4,
            textAlign: 'right',
          }}
        >
          選択範囲: {month}/{selectedRange.from}〜{month}/{selectedRange.to}
          <button
            onClick={() => setSelectedRange(null)}
            style={{
              marginLeft: 8,
              fontSize: ct.fontSize.body,
              cursor: 'pointer',
              background: 'none',
              border: '1px solid currentColor',
              borderRadius: 4,
              padding: '1px 6px',
              color: 'inherit',
            }}
          >
            クリア
          </button>
        </div>
      )}

      <EChart
        option={option}
        height={view === 'deviation' ? 280 : 320}
        onClick={handleBarClick}
        onBrushEnd={view === 'piAmount' || view === 'piQuantity' ? handleBrushEnd : undefined}
        enableBrushClickEmulation={view === 'piAmount' || view === 'piQuantity'}
        ariaLabel="業績指数チャート"
      />

      {view === 'zScore' && hasAnomalies && onDayClick && (
        <AnomalyNote>異常値をクリックすると詳細を表示</AnomalyNote>
      )}

      {/* カテゴリ別PI値ランキング（子チャート） */}
      {currentDateRange && selectedStoreIds && (
        <CategoryPerformanceChart
          categoryData={plan.categoryPerformance.data}
          isLoading={plan.categoryPerformance.isLoading}
          prevYearScope={prevYearScope}
          totalCustomers={totalCustomers ?? 0}
          level={categoryLevel}
          onLevelChange={setCategoryLevel}
        />
      )}

      {/* 店舗別・カテゴリ別PI値比較（子チャート） */}
      {allStoreResults && stores && allStoreResults.size >= 2 && (
        <StorePIComparisonChart
          allStoreResults={allStoreResults}
          stores={stores}
          catOutput={plan.storeCategoryPI.data}
          catIsLoading={plan.storeCategoryPI.isLoading}
          level={storePILevel}
          onLevelChange={setStorePILevel}
        />
      )}
    </ChartCard>
  )
})
