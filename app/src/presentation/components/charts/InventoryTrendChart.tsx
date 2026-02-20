import { useMemo, useState } from 'react'
import {
  LineChart,
  Line,
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
import type { DailyRecord, Store, StoreResult } from '@/domain/models'

const Wrapper = styled.div`
  width: 100%;
  min-height: 360px;
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

const CompTable = styled.div`
  margin-top: ${({ theme }) => theme.spacing[3]};
  overflow-x: auto;
`
const MiniTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 0.6rem;
`
const MiniTh = styled.th`
  text-align: center;
  padding: 3px 6px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text3};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  &:first-child { text-align: left; }
`
const MiniTd = styled.td`
  text-align: center;
  padding: 2px 5px;
  color: ${({ theme }) => theme.colors.text2};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  border-bottom: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'};
  white-space: nowrap;
  &:first-child { text-align: left; font-family: ${({ theme }) => theme.typography.fontFamily.primary}; }
`
const StoreDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 8px; height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  margin-right: 4px;
  vertical-align: middle;
`

type ViewMode = 'aggregate' | 'compare'

interface Props {
  daily: ReadonlyMap<number, DailyRecord>
  daysInMonth: number
  openingInventory: number | null
  closingInventory: number | null
  markupRate: number
  discountRate: number
  /** 店舗比較用: 個別の StoreResult 配列 */
  comparisonResults?: readonly StoreResult[]
  /** 店舗比較用: 店舗マスタ */
  stores?: ReadonlyMap<string, Store>
}

/** 1店舗分の推定在庫推移を計算 */
function computeEstimatedInventory(
  daily: ReadonlyMap<number, DailyRecord>,
  daysInMonth: number,
  openingInventory: number,
  closingInventory: number | null,
  markupRate: number,
  discountRate: number,
) {
  const divisor = 1 - discountRate
  const result: { day: number; estimated: number; actual: number | null }[] = []
  let cumInvCost = 0
  let cumEstCogs = 0

  for (let d = 1; d <= daysInMonth; d++) {
    const rec = daily.get(d)
    if (rec) {
      cumInvCost += rec.purchase.cost + rec.interStoreIn.cost + rec.interStoreOut.cost - rec.deliverySales.cost
      const dayGrossSales = divisor > 0 ? rec.coreSales / divisor : rec.coreSales
      cumEstCogs += dayGrossSales * (1 - markupRate) + rec.consumable.cost
    }
    const actualInv = (d === daysInMonth && closingInventory != null) ? closingInventory : null
    result.push({
      day: d,
      estimated: openingInventory + cumInvCost - cumEstCogs,
      actual: actualInv,
    })
  }
  return result
}

export function InventoryTrendChart({
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

  // 比較可能な店舗（期首在庫ありの店舗のみ）
  const comparableStores = useMemo(() => {
    if (!comparisonResults || !stores) return []
    return comparisonResults
      .filter((r) => r.openingInventory != null)
      .map((r) => ({
        storeId: r.storeId,
        name: stores.get(r.storeId)?.name ?? r.storeId,
        result: r,
      }))
  }, [comparisonResults, stores])

  const canCompare = comparableStores.length >= 2
  const [viewMode, setViewMode] = useState<ViewMode>('aggregate')
  const effectiveMode = canCompare ? viewMode : 'aggregate'

  // --- 合計モード用データ ---
  const aggregateData = useMemo(() => {
    if (openingInventory == null) return null
    const all = computeEstimatedInventory(daily, daysInMonth, openingInventory, closingInventory, markupRate, discountRate)
    return all.filter((d) => d.day >= rangeStart && d.day <= rangeEnd)
  }, [daily, daysInMonth, openingInventory, closingInventory, markupRate, discountRate, rangeStart, rangeEnd])

  // --- 比較モード用データ ---
  const comparisonData = useMemo(() => {
    if (effectiveMode !== 'compare' || comparableStores.length === 0) return null

    // 各店舗の推定在庫を計算
    const storeLines = comparableStores.map((s) => ({
      ...s,
      data: computeEstimatedInventory(
        s.result.daily,
        daysInMonth,
        s.result.openingInventory!,
        s.result.closingInventory,
        s.result.coreMarkupRate,
        s.result.discountRate,
      ),
    }))

    // recharts 用にフラットな配列に変換
    const merged: Record<string, number | null>[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const entry: Record<string, number | null> = { day: d }
      for (const s of storeLines) {
        const pt = s.data[d - 1]
        entry[s.name] = pt?.estimated ?? null
        entry[`${s.name}_actual`] = pt?.actual ?? null
      }
      merged.push(entry)
    }
    return {
      data: merged.filter((d) => (d.day as number) >= rangeStart && (d.day as number) <= rangeEnd),
      storeLines,
    }
  }, [effectiveMode, comparableStores, daysInMonth, rangeStart, rangeEnd])

  if (openingInventory == null && !canCompare) return null

  // --- 比較モード描画 ---
  if (effectiveMode === 'compare' && comparisonData) {
    // サマリーテーブル用: 最終日推定在庫 + 実在庫
    const summaryRows = comparisonData.storeLines.map((s, i) => {
      const lastDay = s.data[s.data.length - 1]
      return {
        name: s.name,
        color: STORE_COLORS[i % STORE_COLORS.length],
        openingInventory: s.result.openingInventory!,
        estClosing: lastDay?.estimated ?? null,
        actualClosing: s.result.closingInventory,
        markupRate: s.result.coreMarkupRate,
        discountRate: s.result.discountRate,
      }
    })

    return (
      <Wrapper>
        <Header>
          <Title>推定在庫推移 店舗比較</Title>
          <TabGroup>
            <Tab $active={viewMode === 'aggregate'} onClick={() => setViewMode('aggregate')}>合計</Tab>
            <Tab $active={viewMode === 'compare'} onClick={() => setViewMode('compare')}>比較</Tab>
          </TabGroup>
        </Header>
        <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height={300}>
          <LineChart data={comparisonData.data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
            <XAxis
              dataKey="day"
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
              axisLine={{ stroke: ct.grid }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
              axisLine={false}
              tickLine={false}
              tickFormatter={toManYen}
              width={55}
            />
            <Tooltip
              contentStyle={tooltipStyle(ct)}
              formatter={(value: number | null, name: string) => {
                if (name.endsWith('_actual')) return [null, null] as unknown as [string, string]
                return [value != null ? toComma(value) : '-', name]
              }}
              labelFormatter={(label) => `${label}日`}
              itemSorter={(item) => -(typeof item.value === 'number' ? item.value : 0)}
            />
            <Legend
              wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
              payload={comparableStores.map((s, i) => ({
                value: s.name,
                type: 'line',
                color: STORE_COLORS[i % STORE_COLORS.length],
              }))}
            />
            {comparableStores.map((s, i) => (
              <Line
                key={s.storeId}
                type="monotone"
                dataKey={s.name}
                stroke={STORE_COLORS[i % STORE_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: STORE_COLORS[i % STORE_COLORS.length], stroke: ct.bg2, strokeWidth: 2 }}
              />
            ))}
            {comparableStores.map((s, i) => (
              s.result.closingInventory != null && (
                <Line
                  key={`${s.storeId}_actual`}
                  type="monotone"
                  dataKey={`${s.name}_actual`}
                  stroke={STORE_COLORS[i % STORE_COLORS.length]}
                  strokeWidth={0}
                  dot={{ r: 5, fill: STORE_COLORS[i % STORE_COLORS.length], stroke: ct.bg2, strokeWidth: 2 }}
                  legendType="none"
                />
              )
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* 店舗サマリーテーブル */}
        <CompTable>
          <MiniTable>
            <thead>
              <tr>
                <MiniTh>店舗</MiniTh>
                <MiniTh>期首在庫</MiniTh>
                <MiniTh>推定期末</MiniTh>
                <MiniTh>実在庫</MiniTh>
                <MiniTh>値入率</MiniTh>
                <MiniTh>売変率</MiniTh>
              </tr>
            </thead>
            <tbody>
              {summaryRows.map((row) => (
                <tr key={row.name}>
                  <MiniTd>
                    <StoreDot $color={row.color} />
                    {row.name}
                  </MiniTd>
                  <MiniTd>{toComma(row.openingInventory)}</MiniTd>
                  <MiniTd>{row.estClosing != null ? toComma(row.estClosing) : '-'}</MiniTd>
                  <MiniTd>{row.actualClosing != null ? toComma(row.actualClosing) : '-'}</MiniTd>
                  <MiniTd>{(row.markupRate * 100).toFixed(1)}%</MiniTd>
                  <MiniTd>{(row.discountRate * 100).toFixed(1)}%</MiniTd>
                </tr>
              ))}
            </tbody>
          </MiniTable>
        </CompTable>

        <DayRangeSlider min={1} max={daysInMonth} start={rangeStart} end={rangeEnd} onChange={setRange} />
      </Wrapper>
    )
  }

  // --- 合計モード描画（従来） ---
  if (!aggregateData) return null

  return (
    <Wrapper>
      <Header>
        <Title>推定在庫推移 vs 実在庫</Title>
        {canCompare && (
          <TabGroup>
            <Tab $active={viewMode === 'aggregate'} onClick={() => setViewMode('aggregate')}>合計</Tab>
            <Tab $active={viewMode === 'compare'} onClick={() => setViewMode('compare')}>比較</Tab>
          </TabGroup>
        )}
      </Header>
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height={canCompare ? 300 : '84%'}>
        <LineChart data={aggregateData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="day"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={false}
            tickLine={false}
            tickFormatter={toManYen}
            width={55}
          />
          <Tooltip
            contentStyle={tooltipStyle(ct)}
            formatter={(value, name) => {
              const labels: Record<string, string> = { estimated: '推定在庫', actual: '実在庫' }
              return [value != null ? toComma(value as number) : '-', labels[name as string] ?? String(name)]
            }}
            labelFormatter={(label) => `${label}日`}
          />
          <Legend
            wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
            formatter={(value) => {
              const labels: Record<string, string> = { estimated: '推定在庫', actual: '実在庫' }
              return labels[value] ?? value
            }}
          />
          <Line
            type="monotone"
            dataKey="estimated"
            stroke={ct.colors.cyan}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: ct.colors.cyan, stroke: ct.bg2, strokeWidth: 2 }}
          />
          {closingInventory != null && (
            <Line
              type="monotone"
              dataKey="actual"
              stroke={ct.colors.success}
              strokeWidth={0}
              dot={{ r: 6, fill: ct.colors.success, stroke: ct.bg2, strokeWidth: 2 }}
            />
          )}
          {openingInventory != null && (
            <ReferenceLine
              y={openingInventory}
              stroke={ct.colors.info}
              strokeDasharray="6 3"
              strokeWidth={1}
              label={{
                value: `期首 ${toManYen(openingInventory)}`,
                position: 'left',
                fill: ct.colors.info,
                fontSize: ct.fontSize.xs,
                fontFamily: ct.monoFamily,
              }}
            />
          )}
          {closingInventory != null && (
            <ReferenceLine
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
        </LineChart>
      </ResponsiveContainer>
      <DayRangeSlider min={1} max={daysInMonth} start={rangeStart} end={rangeEnd} onChange={setRange} />
    </Wrapper>
  )
}
