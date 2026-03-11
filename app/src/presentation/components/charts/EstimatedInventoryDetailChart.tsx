import { useMemo, useState, memo } from 'react'
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'
import { SafeResponsiveContainer as ResponsiveContainer } from '@/presentation/components/charts/SafeResponsiveContainer'
import {
  useChartTheme,
  useCurrencyFormatter,
  toComma,
  toPct,
  toAxisYen,
  STORE_COLORS,
} from './chartTheme'
import { createChartTooltip } from './createChartTooltip'
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
import { fmt, AGG_LABELS } from './EstimatedInventoryDetailChart.helpers'
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
  const ct = useChartTheme()
  const currFmt = useCurrencyFormatter()
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

        {/* チャート: 店舗ごとの推定在庫ライン */}
        <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height={300}>
          <ComposedChart data={compChartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
            <XAxis
              dataKey="day"
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
              axisLine={{ stroke: ct.grid }}
              tickLine={false}
            />
            {anyHasInventory && (
              <YAxis
                yAxisId="left"
                tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
                axisLine={false}
                tickLine={false}
                tickFormatter={toAxisYen}
                width={55}
              />
            )}
            <Tooltip
              content={createChartTooltip({
                ct,
                formatter: (value, name) => [value != null ? toComma(value as number) : '-', name],
                labelFormatter: (label) => `${label}日`,
              })}
            />
            <Legend wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }} />

            {storeEntries.map((s, i) =>
              s.hasInventory ? (
                <Line
                  key={s.storeId}
                  yAxisId="left"
                  type="monotone"
                  dataKey={`${s.name}_推定在庫`}
                  stroke={STORE_COLORS[i % STORE_COLORS.length]}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: STORE_COLORS[i % STORE_COLORS.length],
                    stroke: ct.bg2,
                    strokeWidth: 2,
                  }}
                  isAnimationActive={false}
                />
              ) : null,
            )}
          </ComposedChart>
        </ResponsiveContainer>

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

      {/* ---- チャート ---- */}
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height={280}>
        <ComposedChart data={aggChartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="day"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
          />
          <YAxis
            yAxisId="left"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            tickFormatter={toAxisYen}
            width={55}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            tickFormatter={toAxisYen}
            width={55}
          />
          <Tooltip
            content={createChartTooltip({
              ct,
              formatter: (value, name) => [
                value != null ? toComma(value as number) : '-',
                AGG_LABELS[name as string] ?? String(name),
              ],
              labelFormatter: (label) => `${label}日`,
            })}
          />
          <Legend
            wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            formatter={(value) => AGG_LABELS[value] ?? value}
          />

          <Bar
            yAxisId="right"
            dataKey="inventoryCost"
            fill={ct.colors.info}
            fillOpacity={0.45}
            isAnimationActive={false}
          />
          <Bar
            yAxisId="right"
            dataKey="estCogs"
            fill={ct.colors.warning}
            fillOpacity={0.45}
            isAnimationActive={false}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="estimated"
            stroke={ct.colors.cyan}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: ct.colors.cyan, stroke: ct.bg2, strokeWidth: 2 }}
            isAnimationActive={false}
          />

          <ReferenceLine
            yAxisId="left"
            y={openingInventory!}
            stroke={ct.colors.info}
            strokeDasharray="6 3"
            strokeWidth={1}
            label={{
              value: `期首 ${currFmt(openingInventory!)}`,
              position: 'left',
              fill: ct.colors.info,
              fontSize: ct.fontSize.xs,
              fontFamily: ct.monoFamily,
            }}
          />
          {closingInventory != null && (
            <ReferenceLine
              yAxisId="left"
              y={closingInventory}
              stroke={ct.colors.success}
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: `実在庫 ${currFmt(closingInventory)}`,
                position: 'right',
                fill: ct.colors.success,
                fontSize: ct.fontSize.xs,
                fontFamily: ct.monoFamily,
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

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
