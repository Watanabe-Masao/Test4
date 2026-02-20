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
import { useChartTheme, tooltipStyle, toManYen, toComma } from './chartTheme'
import { DayRangeSlider, useDayRange } from './DayRangeSlider'
import { SalesPurchaseComparisonChart } from './SalesPurchaseComparisonChart'
import { computeEstimatedInventory } from './inventoryCalc'
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

  // 比較可能な店舗（2店舗以上選択されている場合）
  const canCompare = (comparisonResults?.length ?? 0) >= 2
  const [viewMode, setViewMode] = useState<ViewMode>('aggregate')
  const effectiveMode = canCompare ? viewMode : 'aggregate'

  // canCompare が false のとき effectiveMode が 'aggregate' にフォールバックするためリセット不要

  const hasInventory = openingInventory != null

  // --- 合計モード用データ（売上・仕入 + 推定在庫） ---
  const aggregateData = useMemo(() => {
    const invData = hasInventory
      ? computeEstimatedInventory(daily, daysInMonth, openingInventory, closingInventory, markupRate, discountRate)
      : null

    const result: { day: number; sales: number; purchase: number; estimated: number | null; actual: number | null }[] = []
    for (let d = 1; d <= daysInMonth; d++) {
      const rec = daily.get(d)
      const invPt = invData?.[d - 1]
      result.push({
        day: d,
        sales: rec?.sales ?? 0,
        purchase: rec?.purchase.cost ?? 0,
        estimated: invPt?.estimated ?? null,
        actual: invPt?.actual ?? null,
      })
    }
    return result.filter((d) => d.day >= rangeStart && d.day <= rangeEnd)
  }, [daily, daysInMonth, hasInventory, openingInventory, closingInventory, markupRate, discountRate, rangeStart, rangeEnd])

  // daily データが空なら描画不要
  if (daily.size === 0 && !canCompare) return null

  // --- 比較モード描画: 売上・仕入 複合グラフ ---
  if (effectiveMode === 'compare' && comparisonResults && stores) {
    return (
      <SalesPurchaseComparisonChart
        comparisonResults={comparisonResults}
        stores={stores}
        daysInMonth={daysInMonth}
        headerExtra={
          <TabGroup>
            <Tab $active={viewMode === 'aggregate'} onClick={() => setViewMode('aggregate')}>合計</Tab>
            <Tab $active={viewMode === 'compare'} onClick={() => setViewMode('compare')}>比較</Tab>
          </TabGroup>
        }
      />
    )
  }

  // --- 合計モード描画: 売上・仕入(Bar) + 推定在庫(Line) 複合グラフ ---
  const LABELS: Record<string, string> = {
    sales: '売上金額',
    purchase: '仕入金額',
    estimated: '推定在庫',
    actual: '実在庫',
  }

  return (
    <Wrapper>
      <Header>
        <Title>売上・仕入・推定在庫</Title>
        {canCompare ? (
          <TabGroup>
            <Tab $active={effectiveMode === 'aggregate'} onClick={() => setViewMode('aggregate')}>合計</Tab>
            <Tab $active={effectiveMode === 'compare'} onClick={() => setViewMode('compare')}>比較</Tab>
          </TabGroup>
        ) : (
          <TabGroup>
            <Tab $active>合計</Tab>
          </TabGroup>
        )}
      </Header>
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height={canCompare ? 300 : '84%'}>
        <ComposedChart data={aggregateData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
          <XAxis
            dataKey="day"
            tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            axisLine={{ stroke: ct.grid }}
            tickLine={false}
          />
          {/* 左軸: 推定在庫（大きいスケール） */}
          {hasInventory && (
            <YAxis
              yAxisId="left"
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
              axisLine={false}
              tickLine={false}
              tickFormatter={toManYen}
              width={55}
            />
          )}
          {/* 右軸: 売上・仕入（日次スケール） */}
          <YAxis
            yAxisId="right"
            orientation={hasInventory ? 'right' : 'left'}
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

          {/* 棒グラフ: 売上金額・仕入金額 */}
          <Bar
            yAxisId="right"
            dataKey="sales"
            fill={ct.colors.primary}
            fillOpacity={0.55}
            isAnimationActive={false}
          />
          <Bar
            yAxisId="right"
            dataKey="purchase"
            fill={ct.colors.warning}
            fillOpacity={0.55}
            isAnimationActive={false}
          />

          {/* 折れ線グラフ: 推定在庫 */}
          {hasInventory && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="estimated"
              stroke={ct.colors.cyan}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: ct.colors.cyan, stroke: ct.bg2, strokeWidth: 2 }}
            />
          )}
          {hasInventory && closingInventory != null && (
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="actual"
              stroke={ct.colors.success}
              strokeWidth={0}
              dot={{ r: 6, fill: ct.colors.success, stroke: ct.bg2, strokeWidth: 2 }}
            />
          )}

          {/* 基準線 */}
          {hasInventory && (
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
          )}
          {hasInventory && closingInventory != null && (
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
    </Wrapper>
  )
}
