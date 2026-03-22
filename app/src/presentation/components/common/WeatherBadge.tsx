/**
 * 天気バッジ — WMO コードに対応するアイコンとラベルを表示
 */
import { memo } from 'react'
import styled from 'styled-components'
import { categorizeWeatherCode } from '@/domain/calculations/weatherAggregation'
import type { WeatherCategory } from '@/domain/models/record'

interface Props {
  /** WMO Weather Interpretation Code（日照データなしの場合 null） */
  readonly weatherCode: number | null
  /** 気温 (°C)。省略時は非表示 */
  readonly temperature?: number
  /** 最高気温 (°C)。省略時は非表示 */
  readonly temperatureMax?: number
  /** 最低気温 (°C)。省略時は非表示 */
  readonly temperatureMin?: number
  /** コンパクト表示（アイコンのみ） */
  readonly compact?: boolean
  /** 気象庁天気概況テキスト（ツールチップに正式な天気記述を表示） */
  readonly weatherText?: string
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

const TempRangeText = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text3};
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

export const WeatherBadge = memo(function WeatherBadge({
  weatherCode,
  temperature,
  temperatureMax,
  temperatureMin,
  compact = false,
  weatherText,
}: Props) {
  if (weatherCode == null) return null
  const category = categorizeWeatherCode(weatherCode)
  const icon = WEATHER_ICONS[category]
  const tooltipText = weatherText || WEATHER_LABELS[category]

  if (compact) {
    return (
      <BadgeWrapper title={tooltipText}>
        {icon}
        {temperature != null && <TempText>{Math.round(temperature)}°</TempText>}
        {temperatureMax != null && temperatureMin != null && (
          <TempRangeText>
            <HighTemp>{Math.round(temperatureMax)}°</HighTemp>
            <LowTemp>{Math.round(temperatureMin)}°</LowTemp>
          </TempRangeText>
        )}
      </BadgeWrapper>
    )
  }

  return (
    <BadgeWrapper>
      {icon} {WEATHER_LABELS[category]}
      {temperature != null && <TempText> {temperature.toFixed(1)}°C</TempText>}
      {temperatureMax != null && temperatureMin != null && (
        <TempRangeText>
          <HighTemp>{temperatureMax.toFixed(1)}°</HighTemp>
          <LowTemp>{temperatureMin.toFixed(1)}°</LowTemp>
        </TempRangeText>
      )}
    </BadgeWrapper>
  )
})
