/**
 * 天気バッジ — WMO コードに対応するアイコンとラベルを表示
 */
import { memo } from 'react'
import styled from 'styled-components'
import { categorizeWeatherCode } from '@/domain/calculations/weatherAggregation'
import type { WeatherCategory } from '@/domain/models'

interface Props {
  /** WMO Weather Interpretation Code */
  readonly weatherCode: number
  /** 気温 (°C)。省略時は非表示 */
  readonly temperature?: number
  /** コンパクト表示（アイコンのみ） */
  readonly compact?: boolean
}

const WEATHER_ICONS: Record<WeatherCategory, string> = {
  sunny: '\u2600\uFE0F', // ☀️
  cloudy: '\u2601\uFE0F', // ☁️
  rainy: '\uD83C\uDF27\uFE0F', // 🌧️
  snowy: '\u2744\uFE0F', // ❄️
  other: '\uD83C\uDF00', // 🌀
}

const WEATHER_LABELS: Record<WeatherCategory, string> = {
  sunny: '晴れ',
  cloudy: '曇り',
  rainy: '雨',
  snowy: '雪',
  other: '—',
}

const BadgeWrapper = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 0.7rem;
  white-space: nowrap;
`

const TempText = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text3};
  font-size: 0.65rem;
`

export const WeatherBadge = memo(function WeatherBadge({
  weatherCode,
  temperature,
  compact = false,
}: Props) {
  const category = categorizeWeatherCode(weatherCode)
  const icon = WEATHER_ICONS[category]

  if (compact) {
    return (
      <BadgeWrapper title={WEATHER_LABELS[category]}>
        {icon}
        {temperature != null && <TempText>{Math.round(temperature)}°</TempText>}
      </BadgeWrapper>
    )
  }

  return (
    <BadgeWrapper>
      {icon} {WEATHER_LABELS[category]}
      {temperature != null && <TempText> {temperature.toFixed(1)}°C</TempText>}
    </BadgeWrapper>
  )
})
