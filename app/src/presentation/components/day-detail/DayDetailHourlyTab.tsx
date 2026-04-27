/**
 * 時間帯分析タブ — DayDetailModal の時間帯分析タブコンテンツ。
 * 天気店舗セレクタ + HourlyChart を表示。
 *
 * @responsibility R:unclassified
 */
import type { HourlyWeatherRecord } from '@/domain/models/record'
import type { CategoryLeafDailyEntry } from '@/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types'
import type { TimeSlotSeries } from '@/application/hooks/timeSlot/TimeSlotBundle.types'
import { palette } from '@/presentation/theme/tokens'
import {
  DetailSection,
  DetailSectionTitle,
  DetailRow,
  DetailLabel,
  DetailValue,
} from '@/presentation/pages/Dashboard/DashboardPage.styles'
import { HourlyChart } from '@/presentation/pages/Dashboard/widgets/HourlyChart'

interface WeatherCandidate {
  readonly id: string
  readonly name: string
}

interface DayDetailHourlyTabProps {
  /** leaf-grain カテゴリ詳細用 raw CTS（HourlyChart 内の hourDetail で使用） */
  readonly dayRecords: readonly CategoryLeafDailyEntry[]
  readonly prevDayRecords: readonly CategoryLeafDailyEntry[]
  /** timeSlotLane.bundle 由来の時間帯集計 series（amount / quantity 合算源） */
  readonly timeSlotCurrentSeries: TimeSlotSeries | null
  readonly timeSlotComparisonSeries: TimeSlotSeries | null
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
  timeSlotCurrentSeries,
  timeSlotComparisonSeries,
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
        currentSeries={timeSlotCurrentSeries}
        comparisonSeries={timeSlotComparisonSeries}
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
