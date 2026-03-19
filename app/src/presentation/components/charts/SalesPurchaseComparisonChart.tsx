import { useMemo, useState, useCallback, memo } from 'react'
import type { ReactNode } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { toComma, toPct, STORE_COLORS } from './chartTheme'
import { EChart, type EChartsOption } from './EChart'
import { yenYAxis, standardGrid, standardTooltip, standardLegend } from './echartsOptionBuilders'
import { DualPeriodSlider } from './DualPeriodSlider'
import { useDualPeriodRange } from './useDualPeriodRange'
import { computeEstimatedInventory } from '@/application/hooks/calculation'
import { calculateGrossProfitRate } from '@/domain/calculations/utils'
import type { Store, StoreResult } from '@/domain/models'
import { chartFontSize } from '@/presentation/theme/tokens'
import { ChartCard } from './ChartCard'
import {
  Controls,
  ControlGroup,
  ControlLabel,
  ButtonGroup,
  ToggleBtn,
  StoreChip,
  StoreDotInline,
  CompTable,
  MiniTable,
  MiniTh,
  MiniTd,
  StoreDot,
  RankBadge,
} from './SalesPurchaseComparisonChart.styles'

type SortKey = 'sales' | 'cost' | 'diff' | 'gpRate' | 'discountRate' | 'markupRate'
type SeriesMode = 'all' | 'sales' | 'purchase' | 'inventory'

interface Props {
  comparisonResults: readonly StoreResult[]
  stores: ReadonlyMap<string, Store>
  daysInMonth: number
  headerExtra?: ReactNode
}

/** ECharts sub-component for chart rendering */
function SalesCompChart({
  chartData,
  visibleEntries,
  storeEntries,
  showSales,
  showPurchase,
  showInventory,
  seriesMode,
  theme,
}: {
  chartData: readonly Record<string, number | null>[]
  visibleEntries: readonly { storeId: string; name: string; hasInventory: boolean }[]
  storeEntries: readonly { storeId: string; name: string; hasInventory: boolean }[]
  showSales: boolean
  showPurchase: boolean
  showInventory: boolean
  seriesMode: string
  theme: AppTheme
}) {
  const option = useMemo<EChartsOption>(() => {
    const days = chartData.map((d) => String(d.day))
    const series: EChartsOption['series'] = []
    const yAxes: Record<string, unknown>[] = [yenYAxis(theme) as Record<string, unknown>]
    if (showInventory) {
      yAxes.push({
        ...(yenYAxis(theme) as Record<string, unknown>),
        position: 'right',
        splitLine: { show: false },
      })
    }

    for (const s of visibleEntries) {
      const i = storeEntries.indexOf(s)
      const color = STORE_COLORS[i % STORE_COLORS.length]
      if (showSales) {
        series.push({
          name: `${s.name}_売上`,
          type: 'bar',
          yAxisIndex: 0,
          data: chartData.map((d) => d[`${s.name}_売上`] ?? 0),
          itemStyle: { color, opacity: seriesMode === 'all' ? 0.35 : 0.55 },
        })
      }
      if (showPurchase) {
        series.push({
          name: `${s.name}_仕入`,
          type: 'bar',
          yAxisIndex: 0,
          data: chartData.map((d) => d[`${s.name}_仕入`] ?? 0),
          itemStyle: { color, opacity: seriesMode === 'all' ? 0.15 : 0.45 },
        })
      }
      if (showInventory && s.hasInventory) {
        series.push({
          name: `${s.name}_推定在庫`,
          type: 'line',
          yAxisIndex: yAxes.length > 1 ? 1 : 0,
          data: chartData.map((d) => d[`${s.name}_推定在庫`] ?? null),
          lineStyle: { color, width: 2.5 },
          itemStyle: { color },
          symbol: 'none',
        })
      }
    }

    return {
      grid: standardGrid(),
      tooltip: standardTooltip(theme),
      legend: seriesMode === 'all' ? { ...standardLegend(theme), type: 'scroll' } : undefined,
      xAxis: {
        type: 'category',
        data: days,
        axisLabel: {
          color: theme.colors.text3,
          fontSize: chartFontSize.axis,
          fontFamily: theme.typography.fontFamily.mono,
        },
      },
      yAxis: yAxes as EChartsOption['yAxis'],
      series,
    }
  }, [
    chartData,
    visibleEntries,
    storeEntries,
    showSales,
    showPurchase,
    showInventory,
    seriesMode,
    theme,
  ])

  return <EChart option={option} height={300} ariaLabel="売仕比較チャート" />
}

export const SalesPurchaseComparisonChart = memo(function SalesPurchaseComparisonChart({
  comparisonResults,
  stores,
  daysInMonth,
  headerExtra,
}: Props) {
  const theme = useTheme() as AppTheme
  const {
    p1Start: rangeStart,
    p1End: rangeEnd,
    onP1Change: setRange,
    p2Start,
    p2End,
    onP2Change,
    p2Enabled,
  } = useDualPeriodRange(daysInMonth)
  const [sortKey, setSortKey] = useState<SortKey>('sales')
  const [sortDesc, setSortDesc] = useState(true)
  const [seriesMode, setSeriesMode] = useState<SeriesMode>('sales')
  const [visibleStoreIds, setVisibleStoreIds] = useState<Set<string> | null>(null) // null = all

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDesc((d) => !d)
    else {
      setSortKey(key)
      setSortDesc(true)
    }
  }
  const arrow = (key: SortKey) => (sortKey === key ? (sortDesc ? ' ▼' : ' ▲') : '')

  const storeEntries = useMemo(
    () =>
      comparisonResults.map((r) => ({
        storeId: r.storeId,
        name: stores.get(r.storeId)?.name ?? r.storeId,
        hasInventory: r.openingInventory != null,
        result: r,
      })),
    [comparisonResults, stores],
  )

  const anyHasInventory = storeEntries.some((s) => s.hasInventory)

  const toggleStore = useCallback(
    (storeId: string) => {
      setVisibleStoreIds((prev) => {
        if (prev === null) {
          // All visible → hide this one
          const next = new Set(storeEntries.map((s) => s.storeId))
          next.delete(storeId)
          return next.size === 0 ? null : next
        }
        const next = new Set(prev)
        if (next.has(storeId)) {
          next.delete(storeId)
          // If all removed, show all
          return next.size === 0 ? null : next
        }
        next.add(storeId)
        // If all added, return null (= all)
        return next.size === storeEntries.length ? null : next
      })
    },
    [storeEntries],
  )

  const isStoreVisible = useCallback(
    (storeId: string) => visibleStoreIds === null || visibleStoreIds.has(storeId),
    [visibleStoreIds],
  )

  const showSales = seriesMode === 'all' || seriesMode === 'sales'
  const showPurchase = seriesMode === 'all' || seriesMode === 'purchase'
  const showInventory = (seriesMode === 'all' || seriesMode === 'inventory') && anyHasInventory

  const chartData = useMemo(() => {
    const invByStore = new Map<string, ReturnType<typeof computeEstimatedInventory>>()
    for (const s of storeEntries) {
      if (s.hasInventory) {
        invByStore.set(
          s.storeId,
          computeEstimatedInventory(
            s.result.daily,
            daysInMonth,
            s.result.openingInventory!,
            s.result.closingInventory,
            s.result.coreMarkupRate,
            s.result.discountRate,
          ),
        )
      }
    }

    const data: Record<string, number | null>[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const entry: Record<string, number | null> = { day: d }
      for (const s of storeEntries) {
        const rec = s.result.daily.get(d)
        entry[`${s.name}_売上`] = rec?.sales ?? 0
        entry[`${s.name}_仕入`] = rec?.purchase.cost ?? 0
        const inv = invByStore.get(s.storeId)
        entry[`${s.name}_推定在庫`] = inv?.[d - 1]?.estimated ?? null
      }
      data.push(entry)
    }
    return data.filter((d) => (d.day as number) >= rangeStart && (d.day as number) <= rangeEnd)
  }, [storeEntries, daysInMonth, rangeStart, rangeEnd])

  if (storeEntries.length < 2) return null

  const visibleEntries = storeEntries.filter((s) => isStoreVisible(s.storeId))

  return (
    <ChartCard
      title="売上・仕入・推定在庫 店舗比較"
      ariaLabel="売仕比較チャート"
      toolbar={
        <Controls>
          <ControlGroup>
            <ControlLabel>表示系列</ControlLabel>
            <ButtonGroup>
              <ToggleBtn $active={seriesMode === 'sales'} onClick={() => setSeriesMode('sales')}>
                売上
              </ToggleBtn>
              <ToggleBtn
                $active={seriesMode === 'purchase'}
                onClick={() => setSeriesMode('purchase')}
              >
                仕入
              </ToggleBtn>
              {anyHasInventory && (
                <ToggleBtn
                  $active={seriesMode === 'inventory'}
                  onClick={() => setSeriesMode('inventory')}
                >
                  推定在庫
                </ToggleBtn>
              )}
              <ToggleBtn $active={seriesMode === 'all'} onClick={() => setSeriesMode('all')}>
                全て
              </ToggleBtn>
            </ButtonGroup>
          </ControlGroup>
          <ControlGroup>
            <ControlLabel>店舗フィルタ</ControlLabel>
            <ButtonGroup>
              {storeEntries.map((s, i) => (
                <StoreChip
                  key={s.storeId}
                  $active={isStoreVisible(s.storeId)}
                  $color={STORE_COLORS[i % STORE_COLORS.length]}
                  onClick={() => toggleStore(s.storeId)}
                >
                  <StoreDotInline $color={STORE_COLORS[i % STORE_COLORS.length]} />
                  {s.name.length > 6 ? s.name.slice(0, 6) + '…' : s.name}
                </StoreChip>
              ))}
            </ButtonGroup>
          </ControlGroup>
          {headerExtra}
        </Controls>
      }
    >
      <SalesCompChart
        chartData={chartData}
        visibleEntries={visibleEntries}
        storeEntries={storeEntries}
        showSales={showSales}
        showPurchase={showPurchase}
        showInventory={showInventory}
        seriesMode={seriesMode}
        theme={theme}
      />

      {/* 店舗サマリーテーブル */}
      <CompTable>
        <MiniTable>
          <thead>
            <tr>
              <MiniTh>店舗</MiniTh>
              <MiniTh $sortable onClick={() => handleSort('sales')}>
                売上合計{arrow('sales')}
              </MiniTh>
              <MiniTh $sortable onClick={() => handleSort('cost')}>
                仕入原価{arrow('cost')}
              </MiniTh>
              <MiniTh $sortable onClick={() => handleSort('diff')}>
                差額{arrow('diff')}
              </MiniTh>
              <MiniTh $sortable onClick={() => handleSort('gpRate')}>
                粗利率{arrow('gpRate')}
              </MiniTh>
              <MiniTh $sortable onClick={() => handleSort('discountRate')}>
                売変率{arrow('discountRate')}
              </MiniTh>
              <MiniTh>推定期末在庫</MiniTh>
              <MiniTh $sortable onClick={() => handleSort('markupRate')}>
                値入率{arrow('markupRate')}
              </MiniTh>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const rows = storeEntries.map((s, i) => {
                const diff = s.result.totalSales - s.result.inventoryCost
                const gpRate =
                  s.result.invMethodGrossProfitRate ??
                  calculateGrossProfitRate(s.result.estMethodMargin, s.result.totalCoreSales)
                return { s, i, diff, gpRate, discountRate: s.result.discountRate }
              })
              const getVal = (row: (typeof rows)[0]): number => {
                switch (sortKey) {
                  case 'sales':
                    return row.s.result.totalSales
                  case 'cost':
                    return row.s.result.inventoryCost
                  case 'diff':
                    return row.diff
                  case 'gpRate':
                    return row.gpRate
                  case 'discountRate':
                    return row.discountRate
                  case 'markupRate':
                    return row.s.result.coreMarkupRate
                }
              }
              const sorted = [...rows].sort((a, b) =>
                sortDesc ? getVal(b) - getVal(a) : getVal(a) - getVal(b),
              )
              return sorted.map((row, rank) => {
                const estClosing = row.s.result.estMethodClosingInventory
                const dimmed = !isStoreVisible(row.s.storeId)
                return (
                  <tr
                    key={row.s.storeId}
                    style={{
                      opacity: dimmed ? 0.4 : 1,
                      cursor: 'pointer',
                    }}
                    onClick={() => toggleStore(row.s.storeId)}
                  >
                    <MiniTd>
                      <RankBadge $rank={rank + 1}>{rank + 1}</RankBadge>
                      <StoreDot $color={STORE_COLORS[row.i % STORE_COLORS.length]} />
                      {row.s.name}
                    </MiniTd>
                    <MiniTd>{toComma(row.s.result.totalSales)}</MiniTd>
                    <MiniTd>{toComma(row.s.result.inventoryCost)}</MiniTd>
                    <MiniTd>{toComma(row.diff)}</MiniTd>
                    <MiniTd>{toPct(row.gpRate)}</MiniTd>
                    <MiniTd>{toPct(row.discountRate)}</MiniTd>
                    <MiniTd>{estClosing != null ? toComma(estClosing) : '-'}</MiniTd>
                    <MiniTd>{toPct(row.s.result.coreMarkupRate)}</MiniTd>
                  </tr>
                )
              })
            })()}
          </tbody>
        </MiniTable>
      </CompTable>

      <DualPeriodSlider
        min={1}
        max={daysInMonth}
        p1Start={rangeStart}
        p1End={rangeEnd}
        onP1Change={setRange}
        p2Start={p2Start}
        p2End={p2End}
        onP2Change={onP2Change}
        p2Enabled={p2Enabled}
      />
    </ChartCard>
  )
})
