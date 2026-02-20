import { useMemo, useState } from 'react'
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import styled from 'styled-components'
import { useChartTheme, tooltipStyle, toManYen, toComma, STORE_COLORS } from './chartTheme'
import { DayRangeSlider, useDayRange } from './DayRangeSlider'
import { computeEstimatedInventoryDetails } from './inventoryCalc'
import type { InventoryDetailRow } from './inventoryCalc'
import type { DailyRecord, Store, StoreResult } from '@/domain/models'

/* ------------------------------------------------------------------ */
/*  styled                                                             */
/* ------------------------------------------------------------------ */

const Wrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[4]};
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  padding: 0 ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
`

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

const TabGroup = styled.div`
  display: flex;
  gap: 2px;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 2px;
`

const Tab = styled.button<{ $active: boolean }>`
  all: unset;
  cursor: pointer;
  font-size: 0.65rem;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $active, theme }) => ($active ? '#fff' : theme.colors.text3)};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.palette.primary : 'transparent'};
  transition: all 0.15s;
  white-space: nowrap;
  &:hover { opacity: 0.85; }
`

const TableWrap = styled.div`
  overflow-x: auto;
  margin-top: ${({ theme }) => theme.spacing[4]};
`

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.6rem;
`

const Th = styled.th<{ $right?: boolean }>`
  position: sticky;
  top: 0;
  text-align: ${({ $right }) => ($right ? 'right' : 'center')};
  padding: 4px 6px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text3};
  background: ${({ theme }) => theme.colors.bg3};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  &:first-child { text-align: center; }
`

const Td = styled.td<{ $right?: boolean; $highlight?: boolean; $muted?: boolean }>`
  text-align: ${({ $right }) => ($right ? 'right' : 'center')};
  padding: 3px 6px;
  color: ${({ $highlight, $muted, theme }) =>
    $highlight ? theme.colors.palette.cyan : $muted ? theme.colors.text4 : theme.colors.text2};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-weight: ${({ $highlight }) => ($highlight ? 600 : 400)};
  border-bottom: 1px solid ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'};
  white-space: nowrap;
`

const TotalRow = styled.tr`
  font-weight: 600;
  & > ${Td} {
    border-top: 2px solid ${({ theme }) => theme.colors.border};
    border-bottom: none;
    color: ${({ theme }) => theme.colors.text};
  }
`

const StoreDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  margin-right: 4px;
  vertical-align: middle;
`

/* ------------------------------------------------------------------ */
/*  props                                                              */
/* ------------------------------------------------------------------ */

type ViewMode = 'aggregate' | 'compare'

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
/*  helpers                                                            */
/* ------------------------------------------------------------------ */

const fmt = (v: number) => Math.round(v).toLocaleString('ja-JP')

const AGG_LABELS: Record<string, string> = {
  inventoryCost: '在庫仕入原価',
  estCogs: '推定原価',
  estimated: '推定在庫',
}

/* ------------------------------------------------------------------ */
/*  component                                                          */
/* ------------------------------------------------------------------ */

export function EstimatedInventoryDetailChart({
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
  const [rangeStart, rangeEnd, setRange] = useDayRange(daysInMonth)

  const canCompare = (comparisonResults?.length ?? 0) >= 2
  const [viewMode, setViewMode] = useState<ViewMode>('aggregate')
  const effectiveMode = canCompare ? viewMode : 'aggregate'

  const hasInventory = openingInventory != null

  /* ---- 合計モード: 詳細データ ---- */
  const details = useMemo<InventoryDetailRow[]>(() => {
    if (!hasInventory) return []
    return computeEstimatedInventoryDetails(
      daily, daysInMonth, openingInventory, closingInventory, markupRate, discountRate,
    )
  }, [daily, daysInMonth, hasInventory, openingInventory, closingInventory, markupRate, discountRate])

  const aggChartData = useMemo(
    () => details.filter((r) => r.day >= rangeStart && r.day <= rangeEnd),
    [details, rangeStart, rangeEnd],
  )

  const tableRows = useMemo(
    () => details.filter((r) => r.sales > 0 || r.inventoryCost !== 0 || r.estCogs !== 0),
    [details],
  )

  const totals = useMemo(() => {
    let sales = 0, coreSales = 0, grossSales = 0, invCost = 0, cogs = 0, cons = 0
    for (const r of tableRows) {
      sales += r.sales
      coreSales += r.coreSales
      grossSales += r.grossSales
      invCost += r.inventoryCost
      cogs += r.estCogs
      cons += r.consumableCost
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
      <Title>日別推定在庫 計算明細</Title>
      {canCompare ? (
        <TabGroup>
          <Tab $active={effectiveMode === 'aggregate'} onClick={() => setViewMode('aggregate')}>明細</Tab>
          <Tab $active={effectiveMode === 'compare'} onClick={() => setViewMode('compare')}>店舗比較</Tab>
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
      <Wrapper>
        {tabHeader}

        {/* チャート: 店舗ごとの推定在庫ライン */}
        <ResponsiveContainer width="100%" height={300}>
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
                tickFormatter={toManYen}
                width={55}
              />
            )}
            <Tooltip
              contentStyle={tooltipStyle(ct)}
              formatter={(value: number | undefined) => [
                value != null ? toComma(value) : '-',
              ]}
              labelFormatter={(label) => `${label}日`}
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
                  activeDot={{ r: 4, fill: STORE_COLORS[i % STORE_COLORS.length], stroke: ct.bg2, strokeWidth: 2 }}
                  isAnimationActive={false}
                />
              ) : null,
            )}
          </ComposedChart>
        </ResponsiveContainer>

        <DayRangeSlider min={1} max={daysInMonth} start={rangeStart} end={rangeEnd} onChange={setRange} />

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
                    <Td $right>{s.result.openingInventory != null ? fmt(s.result.openingInventory) : '-'}</Td>
                    <Td $right>{fmt(s.result.inventoryCost)}</Td>
                    <Td $right>{fmt(s.result.estMethodCogs)}</Td>
                    <Td $right $highlight>{estClosing != null ? fmt(estClosing) : '-'}</Td>
                    <Td $right>{s.result.closingInventory != null ? fmt(s.result.closingInventory) : '-'}</Td>
                    <Td $right>{(s.result.coreMarkupRate * 100).toFixed(1)}%</Td>
                    <Td $right>{(s.result.discountRate * 100).toFixed(1)}%</Td>
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
    <Wrapper>
      {tabHeader}

      {/* ---- チャート ---- */}
      <ResponsiveContainer width="100%" height={280}>
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
            tickFormatter={toManYen}
            width={55}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            tickFormatter={toManYen}
            width={55}
          />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value: number | undefined, name: string | undefined) => [
              value != null ? toComma(value) : '-',
              AGG_LABELS[name as string] ?? String(name),
            ]}
            labelFormatter={(label) => `${label}日`}
          />
          <Legend
            wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            formatter={(value) => AGG_LABELS[value] ?? value}
          />

          <Bar yAxisId="right" dataKey="inventoryCost" fill={ct.colors.info} fillOpacity={0.45} isAnimationActive={false} />
          <Bar yAxisId="right" dataKey="estCogs" fill={ct.colors.warning} fillOpacity={0.45} isAnimationActive={false} />
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
              value: `期首 ${toManYen(openingInventory!)}`,
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
                value: `実在庫 ${toManYen(closingInventory)}`,
                position: 'right',
                fill: ct.colors.success,
                fontSize: ct.fontSize.xs,
                fontFamily: ct.monoFamily,
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      <DayRangeSlider min={1} max={daysInMonth} start={rangeStart} end={rangeEnd} onChange={setRange} />

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
              <Th $right>消耗品費</Th>
              <Th $right>推定原価</Th>
              <Th $right>累計仕入原価</Th>
              <Th $right>累計推定原価</Th>
              <Th $right>推定在庫</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td>-</Td>
              <Td $right $muted>-</Td>
              <Td $right $muted>-</Td>
              <Td $right $muted>-</Td>
              <Td $right $muted>-</Td>
              <Td $right $muted>-</Td>
              <Td $right $muted>-</Td>
              <Td $right>0</Td>
              <Td $right>0</Td>
              <Td $right $highlight>{fmt(openingInventory!)}</Td>
            </tr>

            {tableRows.map((r) => (
              <tr key={r.day}>
                <Td>{r.day}</Td>
                <Td $right>{fmt(r.sales)}</Td>
                <Td $right>{fmt(r.coreSales)}</Td>
                <Td $right>{fmt(r.grossSales)}</Td>
                <Td $right>{fmt(r.inventoryCost)}</Td>
                <Td $right>{fmt(r.consumableCost)}</Td>
                <Td $right>{fmt(r.estCogs)}</Td>
                <Td $right>{fmt(r.cumInventoryCost)}</Td>
                <Td $right>{fmt(r.cumEstCogs)}</Td>
                <Td $right $highlight>{fmt(r.estimated)}</Td>
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
              <Td $right $highlight>{fmt(lastRow.estimated)}</Td>
            </TotalRow>
          </tbody>
        </Table>
      </TableWrap>
    </Wrapper>
  )
}
