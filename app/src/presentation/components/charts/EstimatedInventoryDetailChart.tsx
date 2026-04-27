import { useMemo, useState, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { useCurrencyFormatter, useCurrencyFormat, toPct, STORE_COLORS } from './chartTheme'
import { EChart } from './EChart'
import { standardGrid, standardTooltip, standardLegend } from './echartsOptionBuilders'
import { categoryXAxis, yenYAxis, lineDefaults } from './builders'

import { computeEstimatedInventoryDetails } from '@/application/hooks/calculation'
import type { InventoryDetailRow } from '@/application/hooks/calculation'
import type { DailyRecord, Store } from '@/domain/models/record'
import type { StoreResult } from '@/domain/models/storeTypes'
import { CHART_GUIDES } from './chartGuides'
import { ChartCard } from './ChartCard'
import {
  TabGroup,
  Tab,
  TableWrap,
  Table,
  Th,
  Td,
  TotalRow,
  StoreDot,
} from './EstimatedInventoryDetailChart.styles'
import {
  createFmt,
  AGG_LABELS,
  filterInventoryDayRange,
  filterNonEmptyInventoryRows,
  summarizeInventoryTotals,
  buildStoreInventoryEntries,
  buildComparisonInventoryData,
} from './EstimatedInventoryDetailChart.helpers'
import type { ViewMode } from './EstimatedInventoryDetailChart.helpers'
import { chartFontSize } from '@/presentation/theme/tokens'

/* ------------------------------------------------------------------  * @responsibility R:unclassified
 */
/*  props                                                              */
/* ------------------------------------------------------------------ */

interface Props {
  daily: ReadonlyMap<number, DailyRecord>
  daysInMonth: number
  openingInventory: number | null
  closingInventory: number | null
  markupRate: number
  discountRate: number
  comparisonResults?: readonly StoreResult[]
  stores?: ReadonlyMap<string, Store>
  rangeStart?: number
  rangeEnd?: number
}

/* ------------------------------------------------------------------ */
/*  component                                                          */
/* ------------------------------------------------------------------ */

export const EstimatedInventoryDetailChart = memo(function EstimatedInventoryDetailChart({
  daily,
  daysInMonth,
  openingInventory,
  closingInventory,
  markupRate,
  discountRate,
  comparisonResults,
  stores,
  rangeStart: rangeStartProp,
  rangeEnd: rangeEndProp,
}: Props) {
  const theme = useTheme() as AppTheme
  const currFmt = useCurrencyFormatter()
  const { format: fmtCurrency } = useCurrencyFormat()
  const fmt = createFmt(fmtCurrency)
  const rangeStart = rangeStartProp ?? 1
  const rangeEnd = rangeEndProp ?? daysInMonth

  const canCompare = (comparisonResults?.length ?? 0) >= 2
  const [viewMode, setViewMode] = useState<ViewMode>('aggregate')
  const effectiveMode = canCompare ? viewMode : 'aggregate'

  const hasInventory = openingInventory != null

  /* ---- 合計モード: 詳細データ ---- */
  const details = useMemo<InventoryDetailRow[]>(() => {
    if (!hasInventory) return []
    return computeEstimatedInventoryDetails(
      daily,
      daysInMonth,
      openingInventory,
      closingInventory,
      markupRate,
      discountRate,
    )
  }, [
    daily,
    daysInMonth,
    hasInventory,
    openingInventory,
    closingInventory,
    markupRate,
    discountRate,
  ])

  const aggChartData = useMemo(
    () => filterInventoryDayRange(details, rangeStart, rangeEnd),
    [details, rangeStart, rangeEnd],
  )

  const tableRows = useMemo(() => filterNonEmptyInventoryRows(details), [details])

  const totals = useMemo(() => summarizeInventoryTotals(tableRows), [tableRows])

  /* ---- 比較モード: 店舗ごとの推定在庫データ ---- */
  const storeEntries = useMemo(
    () => buildStoreInventoryEntries(comparisonResults, stores),
    [comparisonResults, stores],
  )

  const compChartData = useMemo(
    () =>
      canCompare
        ? buildComparisonInventoryData(storeEntries, daysInMonth, rangeStart, rangeEnd)
        : [],
    [canCompare, storeEntries, daysInMonth, rangeStart, rangeEnd],
  )

  if (!hasInventory || details.length === 0) return null

  const lastRow = details[details.length - 1]

  const tabToolbar = canCompare ? (
    <TabGroup>
      <Tab $active={effectiveMode === 'aggregate'} onClick={() => setViewMode('aggregate')}>
        明細
      </Tab>
      <Tab $active={effectiveMode === 'compare'} onClick={() => setViewMode('compare')}>
        店舗比較
      </Tab>
    </TabGroup>
  ) : (
    <TabGroup>
      <Tab $active>明細</Tab>
    </TabGroup>
  )

  /* ================================================================ */
  /*  比較モード                                                       */
  /* ================================================================ */
  if (effectiveMode === 'compare') {
    const anyHasInventory = storeEntries.some((s) => s.hasInventory)
    const compDays = compChartData.map((d: unknown) => String((d as Record<string, unknown>).day))

    return (
      <ChartCard
        title="日別推定在庫 計算明細"
        guide={CHART_GUIDES['estimated-inventory-detail']}
        ariaLabel="推定在庫詳細チャート"
        toolbar={tabToolbar}
      >
        {/* チャート: 店舗ごとの推定在庫ライン (ECharts) */}
        <EChart
          option={{
            grid: standardGrid(),
            tooltip: standardTooltip(theme),
            legend: standardLegend(theme),
            xAxis: categoryXAxis(compDays, theme),
            yAxis: anyHasInventory ? yenYAxis(theme) : { type: 'value' },
            series: storeEntries
              .filter((s) => s.hasInventory)
              .map((s, i) => ({
                name: `${s.name}_推定在庫`,
                type: 'line' as const,
                data: compChartData.map(
                  (d: unknown) => (d as Record<string, unknown>)[`${s.name}_推定在庫`] ?? null,
                ),
                ...lineDefaults({ color: STORE_COLORS[i % STORE_COLORS.length], width: 2.5 }),
              })),
          }}
          height={300}
          ariaLabel="店舗別推定在庫チャート"
        />

        {/* 比較サマリーテーブル */}
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>店舗</Th>
                <Th $right>期首在庫</Th>
                <Th $right>累計仕入原価</Th>
                <Th $right>累計推定原価</Th>
                <Th $right>推定期末在庫</Th>
                <Th $right>実在庫</Th>
                <Th $right>値入率</Th>
                <Th $right>売変率</Th>
              </tr>
            </thead>
            <tbody>
              {storeEntries.map((s, i) => {
                const estClosing = s.result.estMethodClosingInventory
                return (
                  <tr key={s.storeId}>
                    <Td>
                      <StoreDot $color={STORE_COLORS[i % STORE_COLORS.length]} />
                      {s.name}
                    </Td>
                    <Td $right>
                      {s.result.openingInventory != null ? fmt(s.result.openingInventory) : '-'}
                    </Td>
                    <Td $right>{fmt(s.result.inventoryCost)}</Td>
                    <Td $right>{fmt(s.result.estMethodCogs)}</Td>
                    <Td $right $highlight>
                      {estClosing != null ? fmt(estClosing) : '-'}
                    </Td>
                    <Td $right>
                      {s.result.closingInventory != null ? fmt(s.result.closingInventory) : '-'}
                    </Td>
                    <Td $right>{toPct(s.result.coreMarkupRate)}</Td>
                    <Td $right>{toPct(s.result.discountRate)}</Td>
                  </tr>
                )
              })}
            </tbody>
          </Table>
        </TableWrap>
      </ChartCard>
    )
  }

  /* ================================================================ */
  /*  明細モード (合計)                                                 */
  /* ================================================================ */
  const aggDays = (aggChartData as unknown as Record<string, unknown>[]).map((d) => String(d.day))

  return (
    <ChartCard
      title="日別推定在庫 計算明細"
      guide={CHART_GUIDES['estimated-inventory-detail']}
      ariaLabel="推定在庫詳細チャート"
      toolbar={tabToolbar}
    >
      {/* ---- チャート (ECharts) ---- */}
      <EChart
        option={{
          grid: standardGrid(),
          tooltip: standardTooltip(theme),
          legend: {
            ...standardLegend(theme),
            formatter: (name: string) => AGG_LABELS[name] ?? name,
          },
          xAxis: categoryXAxis(aggDays, theme),
          yAxis: [
            yenYAxis(theme) as Record<string, unknown>,
            {
              ...(yenYAxis(theme) as Record<string, unknown>),
              position: 'right',
              splitLine: { show: false },
            },
          ],
          series: [
            {
              name: 'inventoryCost',
              type: 'bar' as const,
              yAxisIndex: 1,
              data: (aggChartData as unknown as Record<string, unknown>[]).map(
                (d) => d.inventoryCost ?? 0,
              ),
              itemStyle: { color: theme.colors.palette.infoDark, opacity: 0.45 },
            },
            {
              name: 'estCogs',
              type: 'bar' as const,
              yAxisIndex: 1,
              data: (aggChartData as unknown as Record<string, unknown>[]).map(
                (d) => d.estCogs ?? 0,
              ),
              itemStyle: { color: theme.colors.palette.warningDark, opacity: 0.45 },
            },
            {
              name: 'estimated',
              type: 'line' as const,
              yAxisIndex: 0,
              data: (aggChartData as unknown as Record<string, unknown>[]).map(
                (d) => d.estimated ?? null,
              ),
              ...lineDefaults({ color: theme.colors.palette.cyanDark, width: 2.5 }),
              markLine: {
                data: [
                  {
                    yAxis: openingInventory!,
                    label: {
                      formatter: `期首 ${currFmt(openingInventory!)}`,
                      position: 'start' as const,
                      fontSize: chartFontSize.annotation,
                    },
                    lineStyle: { color: theme.colors.palette.infoDark, type: 'dashed' as const },
                  },
                  ...(closingInventory != null
                    ? [
                        {
                          yAxis: closingInventory,
                          label: {
                            formatter: `実在庫 ${currFmt(closingInventory)}`,
                            position: 'end' as const,
                            fontSize: chartFontSize.annotation,
                          },
                          lineStyle: { color: theme.chart.barPositive, type: 'dashed' as const },
                        },
                      ]
                    : []),
                ],
                symbol: 'none',
              },
            },
          ],
        }}
        height={280}
        ariaLabel="推定在庫詳細チャート"
      />

      {/* ---- テーブル ---- */}
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>日</Th>
              <Th $right>売上</Th>
              <Th $right>コア売上</Th>
              <Th $right>粗売上</Th>
              <Th $right>在庫仕入原価</Th>
              <Th $right>原価算入費</Th>
              <Th $right>推定原価</Th>
              <Th $right>累計仕入原価</Th>
              <Th $right>累計推定原価</Th>
              <Th $right>推定在庫</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td>-</Td>
              <Td $right $muted>
                -
              </Td>
              <Td $right $muted>
                -
              </Td>
              <Td $right $muted>
                -
              </Td>
              <Td $right $muted>
                -
              </Td>
              <Td $right $muted>
                -
              </Td>
              <Td $right $muted>
                -
              </Td>
              <Td $right>0</Td>
              <Td $right>0</Td>
              <Td $right $highlight>
                {fmt(openingInventory!)}
              </Td>
            </tr>

            {tableRows.map((r) => (
              <tr key={r.day}>
                <Td>{r.day}</Td>
                <Td $right>{fmt(r.sales)}</Td>
                <Td $right>{fmt(r.coreSales)}</Td>
                <Td $right>{fmt(r.grossSales)}</Td>
                <Td $right>{fmt(r.inventoryCost)}</Td>
                <Td $right>{fmt(r.costInclusionCost)}</Td>
                <Td $right>{fmt(r.estCogs)}</Td>
                <Td $right>{fmt(r.cumInventoryCost)}</Td>
                <Td $right>{fmt(r.cumEstCogs)}</Td>
                <Td $right $highlight>
                  {fmt(r.estimated)}
                </Td>
              </tr>
            ))}

            <TotalRow>
              <Td>合計</Td>
              <Td $right>{fmt(totals.sales)}</Td>
              <Td $right>{fmt(totals.coreSales)}</Td>
              <Td $right>{fmt(totals.grossSales)}</Td>
              <Td $right>{fmt(totals.invCost)}</Td>
              <Td $right>{fmt(totals.cons)}</Td>
              <Td $right>{fmt(totals.cogs)}</Td>
              <Td $right>{fmt(lastRow.cumInventoryCost)}</Td>
              <Td $right>{fmt(lastRow.cumEstCogs)}</Td>
              <Td $right $highlight>
                {fmt(lastRow.estimated)}
              </Td>
            </TotalRow>
          </tbody>
        </Table>
      </TableWrap>
    </ChartCard>
  )
})
