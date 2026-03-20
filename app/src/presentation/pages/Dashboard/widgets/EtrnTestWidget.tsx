/**
 * ETRN データ取得テストウィジェット
 *
 * ETRN（過去の気象データ）の取得が正しく動作しているか確認するためのデバッグ用。
 * - 解決された ETRN 観測所情報（prec_no, block_no, stationType）
 * - JMA 観測所情報（station_id, name）
 * - 取得した日別データのサンプル表示
 * - 日付クリックで時間別天気データを展開表示
 */
import { Fragment, memo, useState, useCallback } from 'react'
import { useSettingsStore } from '@/application/stores/settingsStore'
import type { DailyWeatherSummary, StoreLocation } from '@/domain/models/record'
import { categorizeWeatherCode } from '@/domain/calculations/weatherAggregation'
import { useWeatherData } from '@/application/hooks/useWeather'
import {
  useWeatherHourlyOnDemand,
  type HourlyFetchState,
} from '@/application/hooks/useWeatherHourlyOnDemand'
import type { WidgetContext } from './types'
import {
  Wrapper,
  Section,
  SectionTitle,
  Row,
  Label,
  Val,
  DataTable,
  ClickableDate,
  HourlyRow,
  HourlyCell,
  HourlyGrid,
  HourlyItem,
} from './EtrnTestWidget.styles'

const WEATHER_ICONS: Record<string, string> = {
  sunny: '☀',
  cloudy: '☁',
  rainy: '🌧',
  snowy: '❄',
  other: '🌀',
}

interface TestState {
  readonly status: 'idle' | 'loading' | 'done' | 'error'
  readonly daily: readonly DailyWeatherSummary[]
  readonly error?: string
  readonly info?: ResolvedInfo
}

interface ResolvedInfo {
  readonly etrnPrecNo?: number
  readonly etrnBlockNo?: string
  readonly etrnStationType?: string
  readonly etrnStationName?: string
}

interface FlowStep {
  readonly label: string
  readonly value: string
  readonly ok: boolean
}

export const EtrnTestWidget = memo(function EtrnTestWidget({ ctx }: { ctx: WidgetContext }) {
  const { year, month, storeKey } = ctx
  const storeLocations = useSettingsStore((s) => s.settings.storeLocations)
  const location = storeLocations[storeKey]

  // Application hook 経由でデータ取得（禁止事項#11 遵守）
  const { daily, isLoading, error } = useWeatherData(year, month, storeKey)
  const { hourlyCache, fetchHourly } = useWeatherHourlyOnDemand(storeKey, 'sameDate')

  const state: TestState = {
    status: isLoading ? 'loading' : error ? 'error' : 'done',
    daily,
    error: error ?? undefined,
    info: location ? infoFromLocation(location) : undefined,
  }

  const [expandedDate, setExpandedDate] = useState<string | null>(null)

  const handleDateClick = useCallback(
    (dateKey: string) => {
      if (expandedDate === dateKey) {
        setExpandedDate(null)
        return
      }
      setExpandedDate(dateKey)
      fetchHourly(dateKey, year, month)
    },
    [expandedDate, year, month, fetchHourly],
  )

  if (!location) {
    return <Wrapper>店舗の位置情報が未設定です。管理画面で設定してください。</Wrapper>
  }

  const info = state.info ?? infoFromLocation(location)

  return (
    <Wrapper>
      <Section>
        <SectionTitle>
          ETRN 取得テスト — {year}年{month}月
        </SectionTitle>
        <Row>
          <Label>ステータス:</Label>
          <Val>
            {state.status === 'loading' && '取得中...'}
            {state.status === 'done' &&
              (state.daily.length > 0 ? `${state.daily.length}日分取得 ✓` : 'データなし')}
            {state.status === 'error' && `エラー: ${state.error}`}
          </Val>
        </Row>
      </Section>

      <Section>
        <SectionTitle>観測所情報</SectionTitle>
        <Row>
          <Label>緯度/経度:</Label>
          <Val>
            {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
          </Val>
        </Row>
        <Row>
          <Label>ETRN 観測所名:</Label>
          <Val>{info.etrnStationName ?? '(キャッシュ済み)'}</Val>
        </Row>
        <Row>
          <Label>ETRN prec_no:</Label>
          <Val>{info.etrnPrecNo ?? '未解決'}</Val>
        </Row>
        <Row>
          <Label>ETRN block_no:</Label>
          <Val>{info.etrnBlockNo ?? '未解決'}</Val>
        </Row>
        <Row>
          <Label>ETRN type:</Label>
          <Val>{info.etrnStationType ?? '未解決'}</Val>
        </Row>
      </Section>

      <FlowStepsSection location={location} info={info} state={state} />

      {state.daily.length > 0 && (
        <DailyDataSection
          daily={state.daily}
          expandedDate={expandedDate}
          hourlyCache={hourlyCache}
          onDateClick={handleDateClick}
        />
      )}
    </Wrapper>
  )
})

const FlowStepsSection = memo(function FlowStepsSection({
  location,
  info,
  state,
}: {
  readonly location: StoreLocation
  readonly info: ResolvedInfo
  readonly state: TestState
}) {
  return (
    <Section>
      <SectionTitle>取得フロー詳細</SectionTitle>
      <DataTable>
        <thead>
          <tr>
            <th>ステップ</th>
            <th>値</th>
            <th>状態</th>
          </tr>
        </thead>
        <tbody>
          {buildFlowSteps(location, info, state).map((step, i) => (
            <tr key={i}>
              <td>{step.label}</td>
              <td>{step.value}</td>
              <td>{step.ok ? 'OK' : 'NG'}</td>
            </tr>
          ))}
        </tbody>
      </DataTable>
    </Section>
  )
})

const DailyDataSection = memo(function DailyDataSection({
  daily,
  expandedDate,
  hourlyCache,
  onDateClick,
}: {
  readonly daily: readonly DailyWeatherSummary[]
  readonly expandedDate: string | null
  readonly hourlyCache: Readonly<Record<string, HourlyFetchState>>
  readonly onDateClick: (dateKey: string) => void
}) {
  return (
    <Section>
      <SectionTitle>日別データ（{daily.length}日）— 日付クリックで時間別表示</SectionTitle>
      <DataTable>
        <thead>
          <tr>
            <th>日付</th>
            <th>天気</th>
            <th>平均℃</th>
            <th>最高℃</th>
            <th>最低℃</th>
            <th>降水mm</th>
            <th>日照h</th>
            <th>風速km/h</th>
            <th>湿度%</th>
          </tr>
        </thead>
        <tbody>
          {daily.map((d) => {
            const cat = categorizeWeatherCode(d.dominantWeatherCode)
            const isExpanded = expandedDate === d.dateKey
            const hourly = hourlyCache[d.dateKey]
            return (
              <Fragment key={d.dateKey}>
                <tr>
                  <ClickableDate onClick={() => onDateClick(d.dateKey)}>
                    {isExpanded ? '▼' : '▶'} {d.dateKey.slice(5)}
                  </ClickableDate>
                  <td>{WEATHER_ICONS[cat] ?? '?'}</td>
                  <td>{d.temperatureAvg.toFixed(1)}</td>
                  <td>{d.temperatureMax.toFixed(1)}</td>
                  <td>{d.temperatureMin.toFixed(1)}</td>
                  <td>{d.precipitationTotal.toFixed(1)}</td>
                  <td>{d.sunshineTotalHours.toFixed(1)}</td>
                  <td>{d.windSpeedMax.toFixed(1)}</td>
                  <td>{d.humidityAvg.toFixed(0)}</td>
                </tr>
                {isExpanded && (
                  <HourlyRow>
                    <HourlyCell colSpan={9}>
                      {hourly?.status === 'loading' && '時間別データ取得中...'}
                      {hourly?.status === 'error' && `エラー: ${hourly.error}`}
                      {hourly?.status === 'done' && hourly.records.length === 0 && 'データなし'}
                      {hourly?.status === 'done' && hourly.records.length > 0 && (
                        <HourlyGrid>
                          {hourly.records.map((h) => {
                            const hCat = categorizeWeatherCode(h.weatherCode)
                            return (
                              <HourlyItem key={h.hour}>
                                <span>
                                  {String(h.hour).padStart(2, '0')}時 {WEATHER_ICONS[hCat] ?? '?'}
                                </span>
                                <span>{h.temperature.toFixed(1)}℃</span>
                              </HourlyItem>
                            )
                          })}
                        </HourlyGrid>
                      )}
                    </HourlyCell>
                  </HourlyRow>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </DataTable>
    </Section>
  )
})

function buildFlowSteps(location: StoreLocation, info: ResolvedInfo, state: TestState): FlowStep[] {
  const steps: FlowStep[] = [
    {
      label: '1. 緯度/経度',
      value: `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`,
      ok: true,
    },
    {
      label: '2. ETRN prec_no',
      value: info.etrnPrecNo != null ? String(info.etrnPrecNo) : '未解決',
      ok: info.etrnPrecNo != null,
    },
    {
      label: '3. ETRN block_no',
      value: info.etrnBlockNo ?? '未解決',
      ok: !!info.etrnBlockNo,
    },
    {
      label: '4. ETRN type',
      value: info.etrnStationType ?? '未解決',
      ok: !!info.etrnStationType,
    },
    {
      label: '5. 観測所名',
      value: info.etrnStationName ?? '(キャッシュ)',
      ok: !!info.etrnStationName || !!info.etrnBlockNo,
    },
    {
      label: '6. 日別データ件数',
      value: state.status === 'done' ? `${state.daily.length}日` : state.status,
      ok: state.status === 'done' && state.daily.length > 0,
    },
  ]

  if (state.daily.length > 0) {
    const temps = state.daily.map((d) => d.temperatureAvg)
    const minT = Math.min(...temps).toFixed(1)
    const maxT = Math.max(...temps).toFixed(1)
    steps.push({
      label: '7. 平均気温範囲',
      value: `${minT}~${maxT} °C`,
      ok: true,
    })
    const totalPrecip = state.daily.reduce((s, d) => s + d.precipitationTotal, 0)
    steps.push({
      label: '8. 月間降水量合計',
      value: `${totalPrecip.toFixed(1)} mm`,
      ok: true,
    })
  }

  return steps
}

function infoFromLocation(location: StoreLocation): ResolvedInfo {
  return {
    etrnPrecNo: location.etrnPrecNo,
    etrnBlockNo: location.etrnBlockNo,
    etrnStationType: location.etrnStationType,
  }
}
