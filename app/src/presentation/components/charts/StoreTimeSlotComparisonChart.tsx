import { useMemo, useState } from 'react'
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import styled from 'styled-components'
import { useChartTheme, tooltipStyle, toManYen, toComma, STORE_COLORS } from './chartTheme'
import type { CategoryTimeSalesData, Store } from '@/domain/models'
import { useCategoryHierarchy, filterByHierarchy } from './CategoryHierarchyContext'
import { usePeriodFilter, PeriodFilterBar, useHierarchyDropdown, HierarchyDropdowns } from './PeriodFilter'

const Wrapper = styled.div`
  width: 100%;
  min-height: 420px;
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

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
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

const Separator = styled.span`
  width: 1px;
  height: 16px;
  background: ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'};
`

/* 構成比テーブル */
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
const MiniTd = styled.td<{ $highlight?: boolean }>`
  text-align: center;
  padding: 2px 5px;
  color: ${({ theme }) => theme.colors.text2};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  border-bottom: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'};
  background: ${({ $highlight, theme }) =>
    $highlight ? (theme.mode === 'dark' ? 'rgba(99,102,241,0.12)' : 'rgba(99,102,241,0.06)') : 'transparent'};
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

type ViewMode = 'radar' | 'bar'
type MetricMode = 'amount' | 'pct'

interface Props {
  categoryTimeSales: CategoryTimeSalesData
  stores: ReadonlyMap<string, Store>
  daysInMonth: number
  year: number
  month: number
  /** 販売データ存在最大日（スライダーデフォルト値用） */
  dataMaxDay?: number
}

/** 店舗別 時間帯売上パターン比較 */
export function StoreTimeSlotComparisonChart({ categoryTimeSales, stores, daysInMonth, year, month, dataMaxDay }: Props) {
  const ct = useChartTheme()
  const { filter } = useCategoryHierarchy()
  const [viewMode, setViewMode] = useState<ViewMode>('bar')
  const [metricMode, setMetricMode] = useState<MetricMode>('amount')
  const pf = usePeriodFilter(daysInMonth, year, month, dataMaxDay)
  const periodRecords = useMemo(() => pf.filterRecords(categoryTimeSales.records), [categoryTimeSales, pf])
  const hf = useHierarchyDropdown(periodRecords, new Set<string>())

  const { data, dataPct, storeNames, hours, storeTotals } = useMemo(() => {
    const storeHourMap = new Map<string, Map<number, number>>()
    const hourSet = new Set<number>()
    const filtered = hf.applyFilter(filterByHierarchy(periodRecords, filter))

    for (const rec of filtered) {
      if (!storeHourMap.has(rec.storeId)) storeHourMap.set(rec.storeId, new Map())
      const hourMap = storeHourMap.get(rec.storeId)!
      for (const slot of rec.timeSlots) {
        hourSet.add(slot.hour)
        hourMap.set(slot.hour, (hourMap.get(slot.hour) ?? 0) + slot.amount)
      }
    }

    const hours = [...hourSet].sort((a, b) => a - b)
    const storeIds = [...storeHourMap.keys()]
    const storeNames = storeIds.map((id) => ({
      id,
      name: stores.get(id)?.name ?? `店舗${id}`,
    }))

    const div = pf.mode !== 'total' ? pf.divisor : 1

    // 各店舗の合計金額
    const storeTotals = new Map<string, number>()
    for (const s of storeNames) {
      const hourMap = storeHourMap.get(s.id)!
      const total = Math.round([...hourMap.values()].reduce((sum, v) => sum + v, 0) / div)
      storeTotals.set(s.name, total)
    }

    // 金額ベースデータ
    const data = hours.map((h) => {
      const entry: Record<string, string | number> = { hour: `${h}時` }
      for (const s of storeNames) {
        entry[s.name] = Math.round((storeHourMap.get(s.id)?.get(h) ?? 0) / div)
      }
      return entry
    })

    // 構成比ベースデータ
    const dataPct = hours.map((h) => {
      const entry: Record<string, string | number> = { hour: `${h}時` }
      for (const s of storeNames) {
        const amt = storeHourMap.get(s.id)?.get(h) ?? 0
        const total = storeTotals.get(s.name) ?? 1
        entry[s.name] = total > 0 ? Math.round((amt / total) * 1000) / 10 : 0
      }
      return entry
    })

    return { data, dataPct, storeNames, hours, storeTotals }
  }, [periodRecords, stores, filter, pf, hf])

  if (data.length === 0 || storeNames.length <= 1) return null

  const chartData = metricMode === 'pct' ? dataPct : data
  const titleText = metricMode === 'pct'
    ? '店舗別 時間帯構成比パターン比較'
    : '店舗別 時間帯売上パターン比較'

  // 構成比テーブル用: ピーク時間帯を取得
  const peakHours = storeNames.map((s) => {
    let maxHour = -1, maxVal = 0
    for (const d of data) {
      const v = d[s.name] as number
      if (v > maxVal) { maxVal = v; maxHour = hours[data.indexOf(d)] }
    }
    return { name: s.name, peakHour: maxHour, total: storeTotals.get(s.name) ?? 0 }
  })

  return (
    <Wrapper>
      <Header>
        <Title>{titleText}{pf.mode === 'dailyAvg' || pf.mode === 'dowAvg' ? '（日平均）' : ''}</Title>
        <Controls>
          <TabGroup>
            <Tab $active={metricMode === 'amount'} onClick={() => setMetricMode('amount')}>金額</Tab>
            <Tab $active={metricMode === 'pct'} onClick={() => setMetricMode('pct')}>構成比</Tab>
          </TabGroup>
          <Separator />
          <TabGroup>
            <Tab $active={viewMode === 'bar'} onClick={() => setViewMode('bar')}>棒グラフ</Tab>
            <Tab $active={viewMode === 'radar'} onClick={() => setViewMode('radar')}>レーダー</Tab>
          </TabGroup>
        </Controls>
      </Header>
      <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height={340}>
        {viewMode === 'radar' ? (
          <RadarChart data={chartData} margin={{ top: 4, right: 30, left: 30, bottom: 4 }}>
            <PolarGrid stroke={ct.grid} strokeOpacity={0.4} />
            <PolarAngleAxis
              dataKey="hour"
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
            />
            <PolarRadiusAxis
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
              tickFormatter={metricMode === 'pct' ? (v: number) => `${v}%` : toManYen}
            />
            {storeNames.map((s, i) => (
              <Radar
                key={s.id}
                name={s.name}
                dataKey={s.name}
                stroke={STORE_COLORS[i % STORE_COLORS.length]}
                fill={STORE_COLORS[i % STORE_COLORS.length]}
                fillOpacity={0.12}
                strokeWidth={2}
              />
            ))}
            <Legend wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }} />
            <Tooltip
              contentStyle={tooltipStyle(ct)}
              formatter={(value: number | undefined, name: string | undefined) => [
                metricMode === 'pct'
                  ? `${(value ?? 0).toFixed(1)}%`
                  : `${toComma(Math.round(value ?? 0))}円`,
                name ?? '',
              ]}
              itemSorter={(item) => -(typeof item.value === 'number' ? item.value : 0)}
            />
          </RadarChart>
        ) : (
          <ComposedChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.4} />
            <XAxis
              dataKey="hour"
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
              axisLine={{ stroke: ct.grid }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: ct.textMuted, fontSize: ct.fontSize.xs, fontFamily: ct.monoFamily }}
              axisLine={false}
              tickLine={false}
              tickFormatter={metricMode === 'pct' ? (v: number) => `${v}%` : toManYen}
              width={50}
            />
            <Tooltip
              contentStyle={tooltipStyle(ct)}
              formatter={(value: number | undefined, name: string | undefined) => [
                metricMode === 'pct'
                  ? `${(value ?? 0).toFixed(1)}%`
                  : `${toComma(Math.round(value ?? 0))}円`,
                name ?? '',
              ]}
              itemSorter={(item) => -(typeof item.value === 'number' ? item.value : 0)}
            />
            <Legend wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }} />
            {storeNames.map((s, i) => (
              metricMode === 'pct' ? (
                <Line
                  key={s.id}
                  type="monotone"
                  dataKey={s.name}
                  stroke={STORE_COLORS[i % STORE_COLORS.length]}
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls
                />
              ) : (
                <Bar
                  key={s.id}
                  dataKey={s.name}
                  fill={STORE_COLORS[i % STORE_COLORS.length]}
                  fillOpacity={0.7}
                  radius={[2, 2, 0, 0]}
                  maxBarSize={16}
                />
              )
            ))}
          </ComposedChart>
        )}
      </ResponsiveContainer>

      {/* 構成比サマリーテーブル */}
      <CompTable>
        <MiniTable>
          <thead>
            <tr>
              <MiniTh>店舗</MiniTh>
              <MiniTh>合計売上</MiniTh>
              <MiniTh>ピーク時間</MiniTh>
              {hours.filter((_, i) => i % 2 === 0).map((h) => (
                <MiniTh key={h}>{h}時</MiniTh>
              ))}
            </tr>
          </thead>
          <tbody>
            {storeNames.map((s, si) => {
              const total = storeTotals.get(s.name) ?? 0
              const peak = peakHours.find((p) => p.name === s.name)
              // 各時間帯で最大の店舗にハイライト
              return (
                <tr key={s.id}>
                  <MiniTd>
                    <StoreDot $color={STORE_COLORS[si % STORE_COLORS.length]} />
                    {s.name}
                  </MiniTd>
                  <MiniTd>{toComma(total)}円</MiniTd>
                  <MiniTd $highlight>{peak && peak.peakHour >= 0 ? `${peak.peakHour}時` : '-'}</MiniTd>
                  {hours.filter((_, i) => i % 2 === 0).map((h) => {
                    const amt = (data.find((d) => d.hour === `${h}時`)?.[s.name] as number) ?? 0
                    const pct = total > 0 ? ((amt / total) * 100).toFixed(1) : '0.0'
                    return (
                      <MiniTd key={h}>{pct}%</MiniTd>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </MiniTable>
      </CompTable>
      <PeriodFilterBar pf={pf} daysInMonth={daysInMonth} />
      <HierarchyDropdowns hf={hf} />
    </Wrapper>
  )
}
