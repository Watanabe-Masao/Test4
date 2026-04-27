/**
 * 予報バッジ — 気象庁天気コードに対応するアイコンと気温/降水確率を表示
 *
 * WeatherBadge（実測値）との視覚的区別:
 *   - WeatherBadge: WMO コード + 実測気温
 *   - ForecastBadge: 気象庁予報コード + 予報気温 + 降水確率 + 信頼度
 * @responsibility R:unclassified
 */
import { memo } from 'react'
import styled from 'styled-components'
import type { DailyForecast } from '@/domain/models/record'
import { mapJmaWeatherCodeToCategory } from '@/domain/weather/forecastWeatherMapping'
import type { WeatherCategory } from '@/domain/models/record'

interface Props {
  readonly forecast: DailyForecast
  readonly compact?: boolean
}

const WEATHER_ICONS: Record<WeatherCategory, string> = {
  sunny: '\u2600\uFE0F',
  cloudy: '\u2601\uFE0F',
  rainy: '\uD83C\uDF27\uFE0F',
  snowy: '\u2744\uFE0F',
  other: '\uD83C\uDF00',
}

const BadgeWrapper = styled.span`
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  font-size: 0.7rem;
  white-space: nowrap;
`

const TempRangeText = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 0.55rem;
  display: flex;
  gap: 2px;
`

const HighTemp = styled.span`
  color: #e74c3c;
`

const LowTemp = styled.span`
  color: #3498db;
`

const TempText = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text3};
  font-size: 0.6rem;
`

const PopText = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text3};
  font-size: 0.55rem;
  opacity: 0.8;
`

const ReliabilityDot = styled.span<{ $level: 'A' | 'B' | 'C' }>`
  display: inline-block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: ${({ $level }) =>
    $level === 'A' ? '#22c55e' : $level === 'B' ? '#f59e0b' : '#ef4444'};
`

export const ForecastBadge = memo(function ForecastBadge({ forecast, compact = false }: Props) {
  const category = mapJmaWeatherCodeToCategory(forecast.weatherCode)
  const icon = WEATHER_ICONS[category]

  const hasBothTemps = forecast.tempMax != null && forecast.tempMin != null
  const singleTempDisplay =
    !hasBothTemps && forecast.tempMax != null
      ? `${Math.round(forecast.tempMax)}°`
      : !hasBothTemps && forecast.tempMin != null
        ? `${Math.round(forecast.tempMin)}°`
        : null

  const tempRange = hasBothTemps ? (
    <TempRangeText>
      <HighTemp>{Math.round(forecast.tempMax!)}°</HighTemp>
      <LowTemp>{Math.round(forecast.tempMin!)}°</LowTemp>
    </TempRangeText>
  ) : singleTempDisplay ? (
    <TempText>{singleTempDisplay}</TempText>
  ) : null

  if (compact) {
    return (
      <BadgeWrapper>
        <span>{icon}</span>
        {tempRange}
        {forecast.pop != null && <PopText>{forecast.pop}%</PopText>}
        {forecast.reliability && <ReliabilityDot $level={forecast.reliability} />}
      </BadgeWrapper>
    )
  }

  return (
    <BadgeWrapper>
      <span>{icon}</span>
      {tempRange}
      {forecast.pop != null && <PopText>降水 {forecast.pop}%</PopText>}
      {forecast.reliability && <ReliabilityDot $level={forecast.reliability} />}
    </BadgeWrapper>
  )
})
