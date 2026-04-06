/**
 * WeatherCalendarView — 月間天気カレンダー表示
 *
 * 日別詳細テーブルの代替表示。7列のカレンダーグリッドで天気アイコン + 気温を表示。
 * 前年比較付き。クリックで選択連動。
 */
import { memo, useMemo } from 'react'
import styled from 'styled-components'
import type { DailyWeatherSummary } from '@/domain/models/record'
import { categorizeWeatherCode } from '@/domain/weather/weatherAggregation'
import type { WeatherCategory } from '@/domain/models/record'
import { sc } from '@/presentation/theme/semanticColors'

const WEATHER_ICONS: Record<WeatherCategory, string> = {
  sunny: '\u2600\uFE0F',
  cloudy: '\u2601\uFE0F',
  rainy: '\uD83C\uDF27\uFE0F',
  snowy: '\u2744\uFE0F',
  other: '\uD83C\uDF00',
}

const DOW_HEADERS = ['日', '月', '火', '水', '木', '金', '土']

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const DowHeader = styled.div<{ $weekend?: boolean }>`
  text-align: center;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  font-weight: 600;
  padding: 4px;
  color: ${({ $weekend }) => ($weekend ? sc.negative : 'inherit')};
  opacity: 0.6;
`

const DayCell = styled.div<{ $selected?: boolean; $empty?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: 6px 2px;
  border-radius: ${({ theme }) => theme.radii.sm};
  min-height: 72px;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  transition: all 0.15s;
  ${({ $empty }) => ($empty ? 'visibility: hidden;' : '')}
  border: 1px solid ${({ theme }) => theme.colors.border ?? '#e5e7eb'};
  ${({ $selected, theme }) =>
    $selected
      ? `background: ${theme.colors.bg3}; outline: 2px solid ${theme.colors.palette.primary};`
      : `background: ${theme.colors.bg2}; cursor: pointer; &:hover { background: ${theme.colors.bg3}; }`}
`

const DayNum = styled.div<{ $weekend?: boolean }>`
  font-weight: 600;
  color: ${({ $weekend }) => ($weekend ? sc.negative : 'inherit')};
`

const IconRow = styled.div`
  font-size: 1rem;
  line-height: 1;
`

const TempRow = styled.div`
  display: flex;
  gap: 4px;
  font-size: 0.6rem;
`

const PrevRow = styled.div`
  opacity: 0.5;
  display: flex;
  gap: 4px;
  font-size: 0.55rem;
`

interface Props {
  readonly daily: readonly DailyWeatherSummary[]
  readonly prevYearDaily: readonly DailyWeatherSummary[]
  readonly year: number
  readonly month: number
  readonly selectedDays: ReadonlySet<number>
  readonly onDayClick: (dateKey: string) => void
}

export const WeatherCalendarView = memo(function WeatherCalendarView({
  daily,
  prevYearDaily,
  year,
  month,
  selectedDays,
  onDayClick,
}: Props) {
  const prevMap = useMemo(() => {
    const m = new Map<number, DailyWeatherSummary>()
    for (const d of prevYearDaily) m.set(Number(d.dateKey.split('-')[2]), d)
    return m
  }, [prevYearDaily])

  const firstDow = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()

  const cells = useMemo(() => {
    const result: (DailyWeatherSummary | null)[] = []
    // 月初の空セル
    for (let i = 0; i < firstDow; i++) result.push(null)
    // 各日
    const dailyMap = new Map<number, DailyWeatherSummary>()
    for (const d of daily) dailyMap.set(Number(d.dateKey.split('-')[2]), d)
    for (let d = 1; d <= daysInMonth; d++) result.push(dailyMap.get(d) ?? null)
    return result
  }, [daily, firstDow, daysInMonth])

  return (
    <CalendarGrid>
      {DOW_HEADERS.map((h, i) => (
        <DowHeader key={h} $weekend={i === 0 || i === 6}>
          {h}
        </DowHeader>
      ))}
      {cells.map((d, idx) => {
        if (!d) return <DayCell key={`empty-${idx}`} $empty />
        const dayNum = Number(d.dateKey.split('-')[2])
        const dow = (firstDow + dayNum - 1) % 7
        const cat = categorizeWeatherCode(d.dominantWeatherCode)
        const prev = prevMap.get(dayNum)
        const prevCat = prev ? categorizeWeatherCode(prev.dominantWeatherCode) : null
        return (
          <DayCell
            key={d.dateKey}
            $selected={selectedDays.has(dayNum)}
            onClick={() => onDayClick(d.dateKey)}
          >
            <DayNum $weekend={dow === 0 || dow === 6}>{dayNum}</DayNum>
            <IconRow>
              {WEATHER_ICONS[cat]}
              {prevCat && (
                <span style={{ fontSize: '0.7rem', opacity: 0.4 }}>{WEATHER_ICONS[prevCat]}</span>
              )}
            </IconRow>
            <TempRow>
              <span style={{ color: '#ef4444' }}>{d.temperatureMax.toFixed(0)}°</span>
              <span style={{ color: '#3b82f6' }}>{d.temperatureMin.toFixed(0)}°</span>
            </TempRow>
            {prev && (
              <PrevRow>
                <span>{prev.temperatureMax.toFixed(0)}°</span>
                <span>{prev.temperatureMin.toFixed(0)}°</span>
              </PrevRow>
            )}
            {d.precipitationTotal > 0 && (
              <div style={{ fontSize: '0.55rem', color: '#3b82f6' }}>
                {d.precipitationTotal.toFixed(1)}mm
              </div>
            )}
          </DayCell>
        )
      })}
    </CalendarGrid>
  )
})
