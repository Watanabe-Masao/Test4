/**
 * WeatherDetailRow — 日別詳細テーブル行（前年比較付き）
 *
 * WeatherPage の行数制限（R12: 600行）対応のため分離。
 *
 * @responsibility R:unclassified
 */
import type { DailyWeatherSummary } from '@/domain/models/record'
import { categorizeWeatherCode } from '@/domain/weather/weatherAggregation'

/** WeatherBadge と同じ絵文字を使用 */
const WEATHER_ICON_MAP: Record<string, string> = {
  sunny: '\u2600\uFE0F', // ☀️
  cloudy: '\u2601\uFE0F', // ☁️
  rainy: '\uD83C\uDF27\uFE0F', // 🌧️
  snowy: '\u2744\uFE0F', // ❄️
  other: '\uD83C\uDF00', // 🌀
}

const DOW = ['日', '月', '火', '水', '木', '金', '土']

function diffStr(cur: number, prev: number | undefined): string {
  if (prev == null) return ''
  const d = cur - prev
  return d >= 0 ? `+${d.toFixed(1)}` : d.toFixed(1)
}

export function renderDetailRow(
  d: DailyWeatherSummary,
  prev: DailyWeatherSummary | null,
  year: number,
  month: number,
  onDayClick: (dateKey: string) => void,
  selectedDays: ReadonlySet<string>,
) {
  const dayNum = Number(d.dateKey.split('-')[2])
  const dow = new Date(year, month - 1, dayNum).getDay()
  const cat = categorizeWeatherCode(d.dominantWeatherCode)
  const prevCat = prev ? categorizeWeatherCode(prev.dominantWeatherCode) : null
  const isSelected = selectedDays.has(d.dateKey)
  const sub = { fontSize: '0.6rem', color: '#9ca3af', display: 'block' } as const
  return (
    <tr
      key={d.dateKey}
      onClick={() => onDayClick(d.dateKey)}
      style={{
        cursor: 'pointer',
        background: isSelected ? 'var(--color-bg3, #f3f4f6)' : undefined,
      }}
    >
      <td style={{ color: dow === 0 || dow === 6 ? '#ef4444' : undefined }}>
        {dayNum}({DOW[dow]})
      </td>
      <td style={{ textAlign: 'center', fontSize: '1rem' }}>
        {WEATHER_ICON_MAP[cat]}
        {prevCat && <span style={sub}>{WEATHER_ICON_MAP[prevCat]}</span>}
      </td>
      <td>
        {d.temperatureAvg.toFixed(1)}°
        {prev && (
          <span style={sub}>
            {prev.temperatureAvg.toFixed(1)}° ({diffStr(d.temperatureAvg, prev.temperatureAvg)})
          </span>
        )}
      </td>
      <td style={{ color: '#ef4444' }}>
        {d.temperatureMax.toFixed(1)}°
        {prev && <span style={sub}>{prev.temperatureMax.toFixed(1)}°</span>}
      </td>
      <td style={{ color: '#3b82f6' }}>
        {d.temperatureMin.toFixed(1)}°
        {prev && <span style={sub}>{prev.temperatureMin.toFixed(1)}°</span>}
      </td>
      <td>
        {d.precipitationTotal.toFixed(1)}mm
        {prev && <span style={sub}>{prev.precipitationTotal.toFixed(1)}mm</span>}
      </td>
      <td>
        {d.humidityAvg.toFixed(0)}%{prev && <span style={sub}>{prev.humidityAvg.toFixed(0)}%</span>}
      </td>
      <td>
        {d.sunshineTotalHours.toFixed(1)}h
        {prev && <span style={sub}>{prev.sunshineTotalHours.toFixed(1)}h</span>}
      </td>
      <td
        style={{
          textAlign: 'left',
          fontSize: '0.65rem',
          maxWidth: 200,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {d.weatherTextDay ?? d.weatherTextNight ?? ''}
        {prev && <span style={sub}>{prev.weatherTextDay ?? prev.weatherTextNight ?? ''}</span>}
      </td>
    </tr>
  )
}
