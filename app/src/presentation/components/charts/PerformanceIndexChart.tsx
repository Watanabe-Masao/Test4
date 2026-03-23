import { useCallback, useState, useMemo, memo } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { EChart } from './EChart'
import { useChartTheme, toComma, toPct } from './chartTheme'
import { DualPeriodSlider } from './DualPeriodSlider'
import { useDualPeriodRange } from './useDualPeriodRange'
import { CHART_GUIDES } from './chartGuides'
import { ChartCard } from './ChartCard'
import type { DailyRecord } from '@/domain/models/record'
import {
  ViewToggle,
  ViewBtn,
  StatsRow,
  StatChip,
  AnomalyNote,
} from './PerformanceIndexChart.styles'
import { buildPerformanceData, buildPerformanceOption } from './PerformanceIndexChart.builders'

type ViewType = 'pi' | 'deviation' | 'zScore'

const VIEW_LABELS: Record<ViewType, string> = {
  pi: 'PI値',
  deviation: '偏差値',
  zScore: 'Zスコア',
}

interface Props {
  daily: ReadonlyMap<number, DailyRecord>
  daysInMonth: number
  year: number
  month: number
  prevYearDaily?: ReadonlyMap<string, { sales: number; discount: number; customers?: number }>
  /** 日クリック時コールバック（異常値バーのクリックでナビゲーション） */
  onDayClick?: (day: number) => void
}

const EMPTY_PREV_YEAR: ReadonlyMap<
  string,
  { sales: number; discount: number; customers?: number }
> = new Map()

export const PerformanceIndexChart = memo(function PerformanceIndexChart({
  daily,
  daysInMonth,
  year,
  month,
  prevYearDaily,
  onDayClick,
}: Props) {
  const ct = useChartTheme()
  const theme = useTheme() as AppTheme
  const [view, setView] = useState<ViewType>('pi')
  const {
    p1Start: rangeStart,
    p1End: rangeEnd,
    onP1Change: setRange,
    p2Start,
    p2End,
    onP2Change,
    p2Enabled,
  } = useDualPeriodRange(daysInMonth)

  const { chartData, stats, piMa7, prevPiMa7 } = useMemo(
    () => buildPerformanceData(daily, daysInMonth, year, month, prevYearDaily ?? EMPTY_PREV_YEAR),
    [daily, daysInMonth, year, month, prevYearDaily],
  )

  const data = chartData
    .map((d, i) => ({
      ...d,
      piMa7: piMa7[i],
      prevPiMa7: prevPiMa7[i],
    }))
    .filter((d) => d.day >= rangeStart && d.day <= rangeEnd)

  const hasAnomalies = useMemo(
    () => data.some((d) => d.salesZ != null && Math.abs(d.salesZ) >= 2),
    [data],
  )

  const titleMap: Record<ViewType, string> = {
    pi: 'PI値分析（金額PI = 売上/客数×1000 / 7日移動平均）',
    deviation: '偏差値分析（各指標の日別偏差値 / 基準=50）',
    zScore: 'Zスコア分析（平均=0からの乖離度 / |Z|≥2 で異常値）',
  }

  const handleClick = useCallback(
    (params: Record<string, unknown>) => {
      if (!onDayClick || view !== 'zScore') return
      const dataIndex = params.dataIndex as number | undefined
      if (dataIndex == null) return
      const entry = data[dataIndex]
      if (entry && entry.salesZ != null && Math.abs(entry.salesZ) >= 2) {
        onDayClick(entry.day)
      }
    },
    [onDayClick, view, data],
  )

  const option = useMemo(
    () => buildPerformanceOption(data, view, ct, theme),
    [data, view, ct, theme],
  )

  return (
    <ChartCard
      title={titleMap[view]}
      guide={CHART_GUIDES['performance-index']}
      ariaLabel="業績指数チャート"
      toolbar={
        <ViewToggle>
          {(Object.keys(VIEW_LABELS) as ViewType[]).map((v) => (
            <ViewBtn key={v} $active={view === v} onClick={() => setView(v)}>
              {VIEW_LABELS[v]}
            </ViewBtn>
          ))}
        </ViewToggle>
      }
    >
      {view === 'deviation' && (
        <StatsRow>
          <StatChip $color={ct.colors.primary}>
            売上 平均:{toComma(stats.sales.mean)} σ:{toComma(stats.sales.stdDev)}
          </StatChip>
          <StatChip $color={ct.colors.info}>
            客数 平均:{toComma(stats.cust.mean)} σ:{toComma(stats.cust.stdDev)}
          </StatChip>
          <StatChip $color={ct.colors.purple}>
            客単価 平均:{toComma(stats.tx.mean)} σ:{toComma(stats.tx.stdDev)}
          </StatChip>
          <StatChip $color={ct.colors.danger}>
            売変率 平均:{toPct(stats.disc.mean)} σ:{toPct(stats.disc.stdDev)}
          </StatChip>
          <StatChip $color={ct.colors.success}>
            粗利率 平均:{toPct(stats.gp.mean)} σ:{toPct(stats.gp.stdDev)}
          </StatChip>
        </StatsRow>
      )}

      <EChart
        option={option}
        height={view === 'deviation' ? 280 : 320}
        onClick={view === 'zScore' && onDayClick ? handleClick : undefined}
        ariaLabel="業績指数チャート"
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
      {view === 'zScore' && hasAnomalies && onDayClick && (
        <AnomalyNote>異常値をクリックすると詳細を表示</AnomalyNote>
      )}
    </ChartCard>
  )
})
