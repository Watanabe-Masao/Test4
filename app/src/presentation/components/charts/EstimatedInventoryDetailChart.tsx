import { useMemo } from 'react'
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
import { useChartTheme, tooltipStyle, toManYen, toComma } from './chartTheme'
import { DayRangeSlider, useDayRange } from './DayRangeSlider'
import { computeEstimatedInventoryDetails } from './inventoryCalc'
import type { InventoryDetailRow } from './inventoryCalc'
import type { DailyRecord } from '@/domain/models'

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

const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  padding: 0 ${({ theme }) => theme.spacing[4]};
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
}

/* ------------------------------------------------------------------ */
/*  helpers                                                            */
/* ------------------------------------------------------------------ */

const fmt = (v: number) => Math.round(v).toLocaleString('ja-JP')

const LABELS: Record<string, string> = {
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
}: Props) {
  const ct = useChartTheme()
  const [rangeStart, rangeEnd, setRange] = useDayRange(daysInMonth)

  const hasInventory = openingInventory != null

  const details = useMemo<InventoryDetailRow[]>(() => {
    if (!hasInventory) return []
    return computeEstimatedInventoryDetails(
      daily, daysInMonth, openingInventory, closingInventory, markupRate, discountRate,
    )
  }, [daily, daysInMonth, hasInventory, openingInventory, closingInventory, markupRate, discountRate])

  const chartData = useMemo(
    () => details.filter((r) => r.day >= rangeStart && r.day <= rangeEnd),
    [details, rangeStart, rangeEnd],
  )

  // データのある行のみ（テーブル用）
  const tableRows = useMemo(
    () => details.filter((r) => r.sales > 0 || r.inventoryCost !== 0 || r.estCogs !== 0),
    [details],
  )

  // 合計行
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

  if (!hasInventory || details.length === 0) return null

  const lastRow = details[details.length - 1]

  return (
    <Wrapper>
      <Title>日別推定在庫 計算明細</Title>

      {/* ---- チャート ---- */}
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="day"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
          />
          {/* 左軸: 推定在庫(累計スケール) */}
          <YAxis
            yAxisId="left"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            tickFormatter={toManYen}
            width={55}
          />
          {/* 右軸: 日次(在庫仕入原価・推定原価) */}
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
              LABELS[name as string] ?? String(name),
            ]}
            labelFormatter={(label) => `${label}日`}
          />
          <Legend
            wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            formatter={(value) => LABELS[value] ?? value}
          />

          {/* 棒: 在庫仕入原価(日) */}
          <Bar
            yAxisId="right"
            dataKey="inventoryCost"
            fill={ct.colors.info}
            fillOpacity={0.45}
            isAnimationActive={false}
          />
          {/* 棒: 推定原価(日) */}
          <Bar
            yAxisId="right"
            dataKey="estCogs"
            fill={ct.colors.warning}
            fillOpacity={0.45}
            isAnimationActive={false}
          />
          {/* 線: 推定在庫 */}
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

          {/* 基準線: 期首在庫 */}
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
            {/* 期首行 */}
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

            {/* 合計行 */}
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
