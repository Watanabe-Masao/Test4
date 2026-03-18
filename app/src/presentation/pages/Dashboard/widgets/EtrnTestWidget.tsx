/**
 * ETRN データ取得テストウィジェット
 *
 * ETRN（過去の気象データ）の取得が正しく動作しているか確認するためのデバッグ用。
 * - 解決された ETRN 観測所情報（prec_no, block_no, stationType）
 * - JMA 観測所情報（station_id, name）
 * - 取得した日別データのサンプル表示
 */
import { memo, useState, useEffect } from 'react'
import styled from 'styled-components'
import { useSettingsStore } from '@/application/stores/settingsStore'
import type { DailyWeatherSummary, StoreLocation } from '@/domain/models'
import { categorizeWeatherCode } from '@/domain/calculations/weatherAggregation'
import { loadEtrnDailyForStore } from '@/application/usecases/weather/WeatherLoadService'
import type { WidgetContext } from './types'

const Wrapper = styled.div`
  font-size: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const Section = styled.div`
  background: ${({ theme }) => theme.colors.bg2};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 8px;
`

const SectionTitle = styled.div`
  font-weight: 600;
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: 4px;
`

const Row = styled.div`
  display: flex;
  gap: 8px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  line-height: 1.6;
`

const Label = styled.span`
  color: ${({ theme }) => theme.colors.text3};
  min-width: 100px;
`

const Val = styled.span`
  color: ${({ theme }) => theme.colors.text};
`

const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 0.65rem;

  th,
  td {
    padding: 2px 4px;
    text-align: right;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }

  th {
    color: ${({ theme }) => theme.colors.text3};
    font-weight: 500;
  }

  td:first-child,
  th:first-child {
    text-align: left;
  }
`

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

/** 取得フローの各ステップ情報 */
interface FlowStep {
  readonly label: string
  readonly value: string
  readonly ok: boolean
}

export const EtrnTestWidget = memo(function EtrnTestWidget({ ctx }: { ctx: WidgetContext }) {
  const { year, month, storeKey } = ctx
  const storeLocations = useSettingsStore((s) => s.settings.storeLocations)
  const location = storeLocations[storeKey]

  const [state, setState] = useState<TestState>({ status: 'loading', daily: [] })

  useEffect(() => {
    if (!location) return

    let cancelled = false

    const run = async () => {
      try {
        const result = await loadEtrnDailyForStore(storeKey, location, year, month)
        if (cancelled) return
        setState({
          status: 'done',
          daily: result.daily,
          info: {
            etrnPrecNo: result.resolvedStation?.precNo ?? location.etrnPrecNo,
            etrnBlockNo: result.resolvedStation?.blockNo ?? location.etrnBlockNo,
            etrnStationType: result.resolvedStation?.stationType ?? location.etrnStationType,
            etrnStationName: result.resolvedStation?.stationName,
          },
        })
      } catch (err) {
        if (cancelled) return
        setState({
          status: 'error',
          daily: [],
          error: err instanceof Error ? err.message : String(err),
          info: infoFromLocation(location),
        })
      }
    }
    run()

    return () => {
      cancelled = true
    }
  }, [storeKey, location, year, month])

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

      {state.daily.length > 0 && (
        <Section>
          <SectionTitle>日別データ（{state.daily.length}日）</SectionTitle>
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
              {state.daily.map((d) => {
                const cat = categorizeWeatherCode(d.dominantWeatherCode)
                return (
                  <tr key={d.dateKey}>
                    <td>{d.dateKey.slice(5)}</td>
                    <td>{WEATHER_ICONS[cat] ?? '?'}</td>
                    <td>{d.temperatureAvg.toFixed(1)}</td>
                    <td>{d.temperatureMax.toFixed(1)}</td>
                    <td>{d.temperatureMin.toFixed(1)}</td>
                    <td>{d.precipitationTotal.toFixed(1)}</td>
                    <td>{d.sunshineTotalHours.toFixed(1)}</td>
                    <td>{d.windSpeedMax.toFixed(1)}</td>
                    <td>{d.humidityAvg.toFixed(0)}</td>
                  </tr>
                )
              })}
            </tbody>
          </DataTable>
        </Section>
      )}
    </Wrapper>
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

  // 気温範囲サマリ
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
