import { useMemo, useState, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import {
  useCurrencyFormatter,
  useCurrencyFormat,
  toPct,
  STORE_COLORS,
} from './chartTheme'
import { EChart } from './EChart'
import { yenYAxis, standardGrid, standardTooltip, standardLegend } from './echartsOptionBuilders'
import { DualPeriodSlider } from './DualPeriodSlider'
import { useDualPeriodRange } from './useDualPeriodRange'
import { computeEstimatedInventoryDetails } from '@/application/hooks/calculation'
import type { InventoryDetailRow } from '@/application/hooks/calculation'
import type { DailyRecord, Store, StoreResult } from '@/domain/models'
import { ChartHelpButton } from './ChartHeader'
import { CHART_GUIDES } from './chartGuides'
import {
  Wrapper,
  Header,
  Title,
  TabGroup,
  Tab,
  TableWrap,
  Table,
  Th,
  Td,
  TotalRow,
  StoreDot,
} from './EstimatedInventoryDetailChart.styles'
import { createFmt, AGG_LABELS } from './EstimatedInventoryDetailChart.helpers'
import type { ViewMode } from './EstimatedInventoryDetailChart.helpers'

/* ------------------------------------------------------------------ */
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
}: Props) {
  const theme = useTheme() as AppTheme
  const currFmt = useCurrencyFormatter()
  const { format: fmtCurrency } = useCurrencyFormat()
  const fmt = createFmt(fmtCurrency)
  const {
    p1Start: rangeStart,
    p1End: rangeEnd,
    onP1Change: setRange,
    p2Start,
    p2End,
    onP2Change,
    p2Enabled,
  } = useDualPeriodRange(daysInMonth)

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
    () => details.filter((r) => r.day >= rangeStart && r.day <= rangeEnd),
    [details, rangeStart, rangeEnd],
  )

  const tableRows = useMemo(
    () => details.filter((r) => r.sales > 0 || r.inventoryCost !== 0 || r.estCogs !== 0),
    [details],
  )

  const totals = useMemo(() => {
    let sales = 0,
      coreSales = 0,
      grossSales = 0,
      invCost = 0,
      cogs = 0,
      cons = 0
    for (const r of tableRows) {
      sales += r.sales
      coreSales += r.coreSales
      grossSales += r.grossSales
      invCost += r.inventoryCost
      cogs += r.estCogs
      cons += r.costInclusionCost
    }
    return { sales, coreSales, grossSales, invCost, cogs, cons }
  }, [tableRows])

  /* ---- 比較モード: 店舗ごとの推定在庫データ ---- */
  const storeEntries = useMemo(() => {
    if (!comparisonResults || !stores) return []
    return comparisonResults.map((r) => ({
      storeId: r.storeId,
      name: stores.get(r.storeId)?.name ?? r.storeId,
      hasInventory: r.openingInventory != null,
      result: r,
    }))
  }, [comparisonResults, stores])

  const compChartData = useMemo(() => {
    if (!canCompare) return []

    // 店舗ごとに推定在庫を計算
    const detailsByStore = new Map<string, InventoryDetailRow[]>()
    for (const s of storeEntries) {
      if (s.hasInventory) {
        detailsByStore.set(
          s.storeId,
          computeEstimatedInventoryDetails(
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
        const rows = detailsByStore.get(s.storeId)
        entry[`${s.name}_推定在庫`] = rows?.[d - 1]?.estimated ?? null
        entry[`${s.name}_仕入原価`] = rows?.[d - 1]?.inventoryCost ?? 0
        entry[`${s.name}_推定原価`] = rows?.[d - 1]?.estCogs ?? 0
      }
      data.push(entry)
    }
    return data.filter((d) => (d.day as number) >= rangeStart && (d.day as number) <= rangeEnd)
  }, [canCompare, storeEntries, daysInMonth, rangeStart, rangeEnd])

  if (!hasInventory || details.length === 0) return null

  const lastRow = details[details.length - 1]

  const tabHeader = (
    <Header>
      <Title>
        日別推定在庫 計算明細
        <ChartHelpButton guide={CHART_GUIDES['estimated-inventory-detail']} />
      </Title>
      {canCompare ? (
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
      )}
    </Header>
  )

  /* ================================================================ */
  /*  比較モード                                                       */
  /* ================================================================ */
  if (effectiveMode === 'compare') {
    const anyHasInventory = storeEntries.some((s) => s.hasInventory)

    return (
      <Wrapper aria-label="推定在庫詳細チャート">
        {tabHeader}

        {/* チャート: 店舗ごとの推定在庫ライン (ECharts) */}
        <EChart
          option={{
            grid: standardGrid(),
            tooltip: standardTooltip(theme),
            legend: standardLegend(theme),
            xAxis: { type: 'category', data: compChartData.map((d: unknown) => String((d as Record<string, unknown>).day)), axisLabel: { color: theme.colors.text3, fontSize: 10, fontFamily: theme.typography.fontFamily.mono } },
            yAxis: anyHasInventory ? yenYAxis(theme) : { type: 'value' },
            series: storeEntries.filter((s) => s.hasInventory).map((s, i) => ({
              name: `${s.name}_推定在庫`,
              type: 'line' as const,
              data: compChartData.map((d: unknown) => (d as Record<string, unknown>)[`${s.name}_推定在庫`] ?? null),
              lineStyle: { color: STORE_COLORS[i % STORE_COLORS.length], width: 2.5 },
              itemStyle: { color: STORE_COLORS[i % STORE_COLORS.length] },
              symbol: 'none',
            })),
          }}
          height={300}
          ariaLabel="店舗別推定在庫チャート"
        />

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
      </Wrapper>
    )
  }

  /* ================================================================ */
  /*  明細モード (合計)                                                 */
  /* ================================================================ */
  return (
    <Wrapper aria-label="推定在庫詳細チャート">
      {tabHeader}

      {/* ---- チャート (ECharts) ---- */}
      <EChart
        option={{
          grid: standardGrid(),
          tooltip: standardTooltip(theme),
          legend: { ...standardLegend(theme), formatter: (name: string) => AGG_LABELS[name] ?? name },
          xAxis: { type: 'category', data: (aggChartData as unknown as Record<string, unknown>[]).map((d) => String(d.day)), axisLabel: { color: theme.colors.text3, fontSize: 10, fontFamily: theme.typography.fontFamily.mono } },
          yAxis: [
            yenYAxis(theme) as Record<string, unknown>,
            { ...yenYAxis(theme) as Record<string, unknown>, position: 'right', splitLine: { show: false } },
          ],
          series: [
            { name: 'inventoryCost', type: 'bar' as const, yAxisIndex: 1, data: (aggChartData as unknown as Record<string, unknown>[]).map((d) => d.inventoryCost ?? 0), itemStyle: { color: theme.colors.palette.infoDark, opacity: 0.45 } },
            { name: 'estCogs', type: 'bar' as const, yAxisIndex: 1, data: (aggChartData as unknown as Record<string, unknown>[]).map((d) => d.estCogs ?? 0), itemStyle: { color: theme.colors.palette.warningDark, opacity: 0.45 } },
            {
              name: 'estimated', type: 'line' as const, yAxisIndex: 0,
              data: (aggChartData as unknown as Record<string, unknown>[]).map((d) => d.estimated ?? null),
              lineStyle: { color: theme.colors.palette.cyanDark, width: 2.5 },
              itemStyle: { color: theme.colors.palette.cyanDark },
              symbol: 'none',
              markLine: {
                data: [
                  { yAxis: openingInventory!, label: { formatter: `期首 ${currFmt(openingInventory!)}`, position: 'start' as const, fontSize: 9 }, lineStyle: { color: theme.colors.palette.infoDark, type: 'dashed' as const } },
                  ...(closingInventory != null ? [{ yAxis: closingInventory, label: { formatter: `実在庫 ${currFmt(closingInventory)}`, position: 'end' as const, fontSize: 9 }, lineStyle: { color: theme.chart.barPositive, type: 'dashed' as const } }] : []),
                ],
                symbol: 'none',
              },
            },
          ],
        }}
        height={280}
        ariaLabel="推定在庫詳細チャート"
      />

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
    </Wrapper>
  )
})
