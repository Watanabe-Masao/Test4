/**
 * 時間帯分析タブ — DayDetailModal の時間帯分析タブコンテンツ。
 * 天気店舗セレクタ + HourlyChart を表示。
 */
import type { CategoryTimeSalesRecord, HourlyWeatherRecord } from '@/domain/models/record'
import { palette } from '@/presentation/theme/tokens'
import { DetailSection, DetailSectionTitle, DetailRow, DetailLabel, DetailValue } from '../DashboardPage.styles'
import { HourlyChart } from './HourlyChart'

interface WeatherCandidate {
  readonly id: string
  readonly name: string
}

interface DayDetailHourlyTabProps {
  readonly dayRecords: readonly CategoryTimeSalesRecord[]
  readonly prevDayRecords: readonly CategoryTimeSalesRecord[]
  readonly weatherHourly: readonly HourlyWeatherRecord[] | undefined
  readonly prevWeatherHourly: readonly HourlyWeatherRecord[] | undefined
  readonly prevDateKey: string | undefined
  readonly curDateKey: string | undefined
  readonly weatherCandidates: readonly WeatherCandidate[]
  readonly weatherStoreId: string
  readonly weatherStoreName: string
  readonly onWeatherStoreChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
}

export function DayDetailHourlyTab({
  dayRecords,
  prevDayRecords,
  weatherHourly,
  prevWeatherHourly,
  prevDateKey,
  curDateKey,
  weatherCandidates,
  weatherStoreId,
  weatherStoreName,
  onWeatherStoreChange,
}: DayDetailHourlyTabProps) {
  return (
    <>
      {/* 天気データ用店舗セレクタ */}
      {weatherCandidates.length > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 8,
            fontSize: '0.65rem',
          }}
        >
          <span style={{ opacity: 0.6 }}>天気データ:</span>
          <select
            value={weatherStoreId}
            onChange={onWeatherStoreChange}
            style={{
              fontSize: '0.65rem',
              padding: '2px 6px',
              borderRadius: 4,
              border: `1px solid ${palette.slate}`,
              background: 'transparent',
              color: 'inherit',
            }}
          >
            {weatherCandidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {weatherCandidates.length === 1 && weatherStoreName && (
        <div style={{ fontSize: '0.6rem', opacity: 0.5, marginBottom: 4 }}>
          天気データ: {weatherStoreName}
        </div>
      )}
      <HourlyChart
        dayRecords={dayRecords}
        prevDayRecords={prevDayRecords}
        weatherHourly={weatherHourly}
        prevWeatherHourly={prevWeatherHourly}
        prevDateKey={prevDateKey}
        curDateKey={curDateKey}
      />
      {dayRecords.length === 0 && (
        <DetailSection>
          <DetailSectionTitle>時間帯別売上</DetailSectionTitle>
          <DetailRow>
            <DetailLabel>データなし</DetailLabel>
            <DetailValue>-</DetailValue>
          </DetailRow>
        </DetailSection>
      )}
    </>
  )
}
