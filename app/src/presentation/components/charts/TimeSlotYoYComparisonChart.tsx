import { useMemo } from 'react'
import {
  ComposedChart,
  Bar,
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
import { useChartTheme, tooltipStyle, toManYen, toComma } from './chartTheme'
import type { CategoryTimeSalesData, CategoryTimeSalesRecord } from '@/domain/models'
import { useCategoryHierarchy, filterByHierarchy } from './CategoryHierarchyContext'
import { usePeriodFilter, PeriodFilterBar, useHierarchyDropdown, HierarchyDropdowns } from './PeriodFilter'

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

/* KPIサマリー */
const SummaryRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: 0 ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
`

const Metric = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
`

const MetricLabel = styled.span`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
`

const MetricValue = styled.span<{ $color?: string }>`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
`

const ProgressBarWrap = styled.div`
  flex: 1;
  min-width: 100px;
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const ProgressTrack = styled.div`
  height: 8px;
  background: ${({ theme }) => theme.colors.bg4};
  border-radius: 4px;
  overflow: hidden;
`

const ProgressFill = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  width: ${({ $pct }) => Math.min($pct, 150)}%;
  background: ${({ $color }) => $color};
  border-radius: 4px;
  transition: width 0.6s ease;
`

const ProgressLabel = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.6rem;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text3};
`

/* 時間帯別増減テーブル */
const TableWrapper = styled.div`
  margin-top: ${({ theme }) => theme.spacing[3]};
  overflow-x: auto;
  padding: 0 ${({ theme }) => theme.spacing[2]};
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

const MiniTd = styled.td<{ $highlight?: boolean; $positive?: boolean }>`
  text-align: center;
  padding: 2px 5px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  border-bottom: 1px solid ${({ theme }) => theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'};
  white-space: nowrap;
  color: ${({ $highlight, $positive, theme }) =>
    $highlight
      ? $positive ? '#22c55e' : '#ef4444'
      : theme.colors.text2};
  &:first-child {
    text-align: left;
    font-family: ${({ theme }) => theme.typography.fontFamily.primary};
    color: ${({ theme }) => theme.colors.text2};
  }
`

interface Props {
  categoryTimeSales: CategoryTimeSalesData
  prevYearRecords: readonly CategoryTimeSalesRecord[]
  selectedStoreIds: ReadonlySet<string>
  daysInMonth: number
  year: number
  month: number
  /** 販売データ存在最大日（スライダーデフォルト値用） */
  dataMaxDay?: number
}

/** 時間帯別 前年同曜日比較チャート */
export function TimeSlotYoYComparisonChart({
  categoryTimeSales,
  prevYearRecords,
  selectedStoreIds,
  daysInMonth,
  year,
  month,
  dataMaxDay,
}: Props) {
  const ct = useChartTheme()
  const { filter } = useCategoryHierarchy()
  const pf = usePeriodFilter(daysInMonth, year, month, dataMaxDay)
  const periodRecords = useMemo(() => pf.filterRecords(categoryTimeSales.records), [categoryTimeSales, pf])
  const prevPeriodRecords = useMemo(() => pf.filterRecords(prevYearRecords), [prevYearRecords, pf])
  const hf = useHierarchyDropdown(periodRecords, selectedStoreIds)

  const { chartData, summary, tableRows } = useMemo(() => {
    const div = pf.mode !== 'total' ? pf.divisor : 1

    // 前年データがカバーする日の範囲を特定し、当年も同じ日のみ比較する
    const prevDaySet = new Set(prevPeriodRecords.map((r) => r.day))

    // 当年集計（前年とカバー日が重なるレコードのみ合計に含める）
    const curHourly = new Map<number, number>()
    let curTotal = 0
    const curFiltered = hf.applyFilter(filterByHierarchy(periodRecords, filter))
    for (const rec of curFiltered) {
      if (selectedStoreIds.size > 0 && !selectedStoreIds.has(rec.storeId)) continue
      if (!prevDaySet.has(rec.day)) continue
      curTotal += rec.totalAmount
      for (const slot of rec.timeSlots) {
        curHourly.set(slot.hour, (curHourly.get(slot.hour) ?? 0) + slot.amount)
      }
    }

    // 前年集計
    const prevHourly = new Map<number, number>()
    let prevTotal = 0
    const prevFiltered = hf.applyFilter(filterByHierarchy(prevPeriodRecords, filter))
    for (const rec of prevFiltered) {
      if (selectedStoreIds.size > 0 && !selectedStoreIds.has(rec.storeId)) continue
      prevTotal += rec.totalAmount
      for (const slot of rec.timeSlots) {
        prevHourly.set(slot.hour, (prevHourly.get(slot.hour) ?? 0) + slot.amount)
      }
    }

    // 時間帯一覧
    const allHours = new Set([...curHourly.keys(), ...prevHourly.keys()])
    const hours = [...allHours].sort((a, b) => a - b)

    // チャートデータ
    const chartData = hours.map((h) => {
      const cur = Math.round((curHourly.get(h) ?? 0) / div)
      const prev = Math.round((prevHourly.get(h) ?? 0) / div)
      const diff = cur - prev
      const ratio = prev > 0 ? cur / prev : null
      return {
        hour: `${h}時`,
        current: cur,
        prevYear: prev,
        diff,
        ratio,
        ratioLabel: ratio != null ? `${(ratio * 100).toFixed(0)}%` : '-',
      }
    })

    // サマリー
    const yoyRatio = prevTotal > 0 ? curTotal / prevTotal : null
    const yoyDiff = curTotal - prevTotal

    // 最大増加・最大減少時間帯（diff は既に div で除算済み→再除算しない）
    let maxIncHour = -1, maxIncDiff = 0
    let maxDecHour = -1, maxDecDiff = 0
    for (const d of chartData) {
      if (d.diff > maxIncDiff) { maxIncDiff = d.diff; maxIncHour = parseInt(d.hour) }
      if (d.diff < maxDecDiff) { maxDecDiff = d.diff; maxDecHour = parseInt(d.hour) }
    }

    // テーブル行
    const tableRows = chartData.map((d) => ({
      hour: d.hour,
      current: d.current,
      prevYear: d.prevYear,
      diff: d.diff,
      ratio: d.ratio,
    }))

    return {
      chartData,
      summary: {
        curTotal,
        prevTotal,
        yoyRatio,
        yoyDiff,
        maxIncHour,
        maxIncDiff,
        maxDecHour,
        maxDecDiff,
      },
      tableRows,
    }
  }, [periodRecords, prevPeriodRecords, selectedStoreIds, filter, pf, hf])

  if (chartData.length === 0) return null

  const yoyColor = (summary.yoyRatio ?? 0) >= 1 ? ct.colors.success : ct.colors.danger

  return (
    <Wrapper>
      <Header>
        <Title>
          時間帯別 前年同曜日比較
          {pf.mode === 'dailyAvg' ? '（日平均）' : pf.mode === 'dowAvg' ? '（曜日別平均）' : ''}
        </Title>
      </Header>

      {/* サマリー */}
      <SummaryRow>
        <Metric>
          <MetricLabel>当年合計</MetricLabel>
          <MetricValue>{toManYen(summary.curTotal)}円</MetricValue>
        </Metric>
        {summary.yoyRatio != null && (
          <ProgressBarWrap>
            <ProgressLabel>
              <span>前年比 {(summary.yoyRatio * 100).toFixed(1)}%</span>
              <span>{summary.yoyDiff >= 0 ? '+' : ''}{toManYen(summary.yoyDiff)}円</span>
            </ProgressLabel>
            <ProgressTrack>
              <ProgressFill $pct={summary.yoyRatio * 100} $color={yoyColor} />
            </ProgressTrack>
          </ProgressBarWrap>
        )}
        <Metric>
          <MetricLabel>前年合計</MetricLabel>
          <MetricValue $color={ct.colors.slate}>{toManYen(summary.prevTotal)}円</MetricValue>
        </Metric>
        {summary.maxIncHour >= 0 && (
          <Metric>
            <MetricLabel>最大増加時間帯</MetricLabel>
            <MetricValue $color="#22c55e">{summary.maxIncHour}時 (+{toManYen(summary.maxIncDiff)})</MetricValue>
          </Metric>
        )}
        {summary.maxDecHour >= 0 && (
          <Metric>
            <MetricLabel>最大減少時間帯</MetricLabel>
            <MetricValue $color="#ef4444">{summary.maxDecHour}時 ({toManYen(summary.maxDecDiff)})</MetricValue>
          </Metric>
        )}
      </SummaryRow>

      {/* チャート: 当年バー + 前年ライン + 差分バー */}
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer minWidth={0} minHeight={0} width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="yoyCurGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ct.colors.primary} stopOpacity={0.85} />
                <stop offset="100%" stopColor={ct.colors.primary} stopOpacity={0.4} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={ct.grid} strokeOpacity={0.5} />
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
              tickFormatter={toManYen}
              width={50}
            />
            <ReferenceLine y={0} stroke={ct.grid} />
            <Tooltip
              contentStyle={tooltipStyle(ct)}
              formatter={(value: number | undefined, name: string | undefined) => {
                const labels: Record<string, string> = {
                  current: '当年',
                  prevYear: '前年同曜日',
                  diff: '差分',
                }
                const label = labels[name as string] ?? String(name)
                const v = value ?? 0
                if (name === 'diff') {
                  const sign = v >= 0 ? '+' : ''
                  return [`${sign}${toComma(v)}円`, label]
                }
                return [`${toComma(v)}円`, label]
              }}
              itemSorter={(item) => -(typeof item.value === 'number' ? item.value : 0)}
            />
            <Legend
              wrapperStyle={{ fontSize: ct.fontSize.xs, fontFamily: ct.fontFamily }}
              formatter={(value) => {
                const labels: Record<string, string> = {
                  current: '当年',
                  prevYear: '前年同曜日',
                  diff: '差分',
                }
                return labels[value] ?? value
              }}
            />
            <Bar
              dataKey="current"
              fill="url(#yoyCurGrad)"
              radius={[3, 3, 0, 0]}
              maxBarSize={20}
            />
            <Line
              type="monotone"
              dataKey="prevYear"
              stroke={ct.colors.slate}
              strokeWidth={2.5}
              strokeDasharray="5 3"
              dot={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 時間帯別増減テーブル */}
      <TableWrapper>
        <MiniTable>
          <thead>
            <tr>
              <MiniTh>時間帯</MiniTh>
              <MiniTh>当年</MiniTh>
              <MiniTh>前年</MiniTh>
              <MiniTh>差分</MiniTh>
              <MiniTh>前年比</MiniTh>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => {
              const isPositive = row.diff >= 0
              return (
                <tr key={row.hour}>
                  <MiniTd>{row.hour}</MiniTd>
                  <MiniTd>{toComma(row.current)}円</MiniTd>
                  <MiniTd>{toComma(row.prevYear)}円</MiniTd>
                  <MiniTd $highlight $positive={isPositive}>
                    {isPositive ? '+' : ''}{toComma(row.diff)}円
                  </MiniTd>
                  <MiniTd $highlight $positive={isPositive}>
                    {row.ratio != null ? `${(row.ratio * 100).toFixed(1)}%` : '-'}
                  </MiniTd>
                </tr>
              )
            })}
          </tbody>
        </MiniTable>
      </TableWrapper>

      <PeriodFilterBar pf={pf} daysInMonth={daysInMonth} />
      <HierarchyDropdowns hf={hf} />
    </Wrapper>
  )
}
