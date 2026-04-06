/**
 * WeatherPage — 過去の天気データ閲覧ページ
 *
 * 売上データなしで単独表示可能。ETRN（気象庁過去の気象データ検索）から
 * 月別の日別天気データを取得し、詳細な気象情報を閲覧する。
 *
 * 店舗の位置情報が未設定の場合はインラインで設定可能。
 */
import { memo, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDataStore } from '@/application/stores/dataStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useWeatherData } from '@/application/hooks/useWeather'
import { useWeatherForecast } from '@/application/hooks/useWeatherForecast'
import { useWeatherHourlyOnDemand } from '@/application/hooks/useWeatherHourlyOnDemand'
import type { DailyForecast, StoreLocation } from '@/domain/models/record'
import { categorizeWeatherCode } from '@/domain/weather/weatherAggregation'
import type { WeatherCategory } from '@/domain/models/record'
import { WeatherBadge } from '@/presentation/components/common/WeatherBadge'
import { ForecastBadge } from '@/presentation/components/common/ForecastBadge'
import { HourlyWeatherModal } from '@/presentation/pages/Dashboard/widgets/HourlyWeatherModal'
import { WeatherTemperatureChart } from './WeatherTemperatureChart'
import { InlineLocationSetup } from './InlineLocationSetup'
import { computeMonthSummary } from './weatherSummary'
import {
  Page,
  Header,
  PageTitle,
  Controls,
  Select,
  NavBtn,
  MonthLabel,
  SectionLabel,
  Grid,
  DayCell,
  ForecastCell,
  DayLabelText,
  SummaryGrid,
  SummaryCard,
  SummaryValue,
  SummaryUnit,
  SummaryCaption,
  TableWrapper,
  DetailTable,
  PrecipBar,
  SetupBox,
  Spinner,
  LoadingBox,
  ErrorText,
  StationBadge,
} from './WeatherPage.styles'

// ── Animations ──

const fadeSlideVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
}

const fadeTransition = { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const }

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.04 } },
}

const staggerItem = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
}

// ── Constants ──

const WEATHER_ICONS: Record<WeatherCategory, string> = {
  sunny: '☀',
  cloudy: '☁',
  rainy: '☂',
  snowy: '❄',
  other: '—',
}

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

// ── Main Page ──

export const WeatherPage = memo(function WeatherPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const currentMonthData = useDataStore((s) => s.currentMonthData)
  const storeLocations = useSettingsStore((s) => s.settings.storeLocations)
  const updateSettings = useSettingsStore((s) => s.updateSettings)

  // 店舗リスト: MonthlyData があればそこから、なければ storeLocations のキーから
  const storeEntries = useMemo<readonly [string, string][]>(() => {
    if (currentMonthData?.stores) {
      return Array.from(currentMonthData.stores.entries()).map(([id, s]) => [id, s.name ?? id])
    }
    const locKeys = Object.keys(storeLocations)
    if (locKeys.length > 0) return locKeys.map((id) => [id, storeLocations[id]?.resolvedName ?? id])
    return [['default', 'デフォルト店舗']]
  }, [currentMonthData, storeLocations])

  const [selectedStoreId, setSelectedStoreId] = useState(() => {
    const withLoc = storeEntries.find(([id]) => storeLocations[id])
    return withLoc?.[0] ?? storeEntries[0]?.[0] ?? 'default'
  })

  const location = storeLocations[selectedStoreId]

  // 天気データ取得
  const { daily, isLoading, error, reload } = useWeatherData(year, month, selectedStoreId)
  const { forecasts } = useWeatherForecast(selectedStoreId)
  const { hourlyCache, prevHourlyCache, fetchHourly, fetchPrevHourly, resolvePrevDate } =
    useWeatherHourlyOnDemand(selectedStoreId, 'sameDate')

  const [modalDate, setModalDate] = useState<string | null>(null)
  const [modalForecast, setModalForecast] = useState<DailyForecast | null>(null)

  // 月ナビ
  const goPrev = useCallback(() => {
    setMonth((m) => {
      if (m === 1) {
        setYear((y) => y - 1)
        return 12
      }
      return m - 1
    })
  }, [setYear])
  const goNext = useCallback(() => {
    setMonth((m) => {
      if (m === 12) {
        setYear((y) => y + 1)
        return 1
      }
      return m + 1
    })
  }, [setYear])

  const handleDayClick = useCallback(
    (dateKey: string) => {
      setModalDate(dateKey)
      setModalForecast(null)
      fetchHourly(dateKey, year, month)
      fetchPrevHourly(dateKey)
    },
    [year, month, fetchHourly, fetchPrevHourly],
  )

  const handleForecastClick = useCallback(
    (f: DailyForecast) => {
      setModalDate(f.dateKey)
      setModalForecast(f)
      fetchPrevHourly(f.dateKey)
    },
    [fetchPrevHourly],
  )

  const handleLocationSave = useCallback(
    (loc: StoreLocation) => {
      updateSettings({
        storeLocations: { ...storeLocations, [selectedStoreId]: loc },
      })
    },
    [selectedStoreId, storeLocations, updateSettings],
  )

  // 月間サマリ
  const summary = useMemo(() => computeMonthSummary(daily), [daily])

  // 実測/予報分離
  const observedKeys = useMemo(() => new Set(daily.map((d) => d.dateKey)), [daily])
  const futureForecasts = useMemo(
    () => forecasts.filter((f) => !observedKeys.has(f.dateKey)),
    [forecasts, observedKeys],
  )

  // 降水量最大値（バー表示スケール用）
  const maxPrecip = useMemo(() => Math.max(...daily.map((d) => d.precipitationTotal), 1), [daily])

  // モーダル
  const modalHourly = modalDate ? hourlyCache[modalDate] : undefined
  const modalPrevHourly = modalDate ? prevHourlyCache[modalDate] : undefined
  const modalPrevDate = modalDate ? resolvePrevDate(modalDate) : null
  const showModal =
    modalDate &&
    ((modalHourly?.status === 'done' && modalHourly.records.length > 0) ||
      (modalForecast &&
        (modalPrevHourly?.status === 'done' || modalPrevHourly?.status === 'loading')))

  return (
    <Page>
      <Header>
        <PageTitle>
          <span style={{ fontSize: '1.5rem' }}>🌤</span> 天気データ
        </PageTitle>
        {location && (
          <StationBadge>
            📍{' '}
            {location.resolvedName ??
              `${location.latitude.toFixed(2)}, ${location.longitude.toFixed(2)}`}
          </StationBadge>
        )}
        <Controls>
          {storeEntries.length > 1 && (
            <Select value={selectedStoreId} onChange={(e) => setSelectedStoreId(e.target.value)}>
              {storeEntries.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </Select>
          )}
          <NavBtn onClick={goPrev}>◀</NavBtn>
          <MonthLabel>
            {year}年{month}月
          </MonthLabel>
          <NavBtn onClick={goNext}>▶</NavBtn>
          {location && (
            <NavBtn onClick={reload} title="再取得">
              🔄
            </NavBtn>
          )}
        </Controls>
      </Header>

      <AnimatePresence mode="wait">
        {/* 位置情報未設定 */}
        {!location && (
          <SetupBox
            key="setup"
            variants={fadeSlideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={fadeTransition}
          >
            <div style={{ fontSize: '3rem', marginBottom: 16 }}>🌍</div>
            <h2 style={{ fontSize: '1rem', marginBottom: 8 }}>観測所を選択してください</h2>
            <p style={{ fontSize: '0.8rem', marginBottom: 24, opacity: 0.7 }}>
              天気データを表示するには、最寄りの気象観測所を設定します。
            </p>
            <InlineLocationSetup onSave={handleLocationSave} />
          </SetupBox>
        )}

        {/* ローディング */}
        {location && isLoading && daily.length === 0 && (
          <LoadingBox key="loading">
            <Spinner />
            <span>
              {year}年{month}月の天気データを取得中...
            </span>
          </LoadingBox>
        )}

        {/* エラー */}
        {location && error && <ErrorText key="error">{error}</ErrorText>}

        {/* メインコンテンツ */}
        {location && daily.length > 0 && (
          <motion.div
            key={`${year}-${month}`}
            variants={fadeSlideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={fadeTransition}
          >
            {/* 月間サマリカード */}
            {summary && (
              <>
                <SectionLabel>📊 月間サマリ</SectionLabel>
                <SummaryGrid variants={staggerContainer} initial="initial" animate="animate">
                  <SummaryCard variants={staggerItem} $accent="#f59e0b">
                    <SummaryValue>
                      {summary.avgTemp.toFixed(1)}
                      <SummaryUnit>°C</SummaryUnit>
                    </SummaryValue>
                    <SummaryCaption>平均気温</SummaryCaption>
                  </SummaryCard>
                  <SummaryCard variants={staggerItem} $accent="#ef4444">
                    <SummaryValue>
                      {summary.maxTemp.toFixed(1)}
                      <SummaryUnit>°C</SummaryUnit>
                    </SummaryValue>
                    <SummaryCaption>最高気温</SummaryCaption>
                  </SummaryCard>
                  <SummaryCard variants={staggerItem} $accent="#3b82f6">
                    <SummaryValue>
                      {summary.minTemp.toFixed(1)}
                      <SummaryUnit>°C</SummaryUnit>
                    </SummaryValue>
                    <SummaryCaption>最低気温</SummaryCaption>
                  </SummaryCard>
                  <SummaryCard variants={staggerItem} $accent="#3b82f6">
                    <SummaryValue>
                      {summary.totalPrecip.toFixed(1)}
                      <SummaryUnit>mm</SummaryUnit>
                    </SummaryValue>
                    <SummaryCaption>総降水量</SummaryCaption>
                  </SummaryCard>
                  <SummaryCard variants={staggerItem} $accent="#f59e0b">
                    <SummaryValue>
                      {summary.sunshineHours.toFixed(1)}
                      <SummaryUnit>h</SummaryUnit>
                    </SummaryValue>
                    <SummaryCaption>日照時間</SummaryCaption>
                  </SummaryCard>
                  <SummaryCard variants={staggerItem} $accent="#10b981">
                    <SummaryValue>
                      {summary.sunnyDays}
                      <SummaryUnit> / {daily.length}日</SummaryUnit>
                    </SummaryValue>
                    <SummaryCaption>
                      ☀{summary.sunnyDays} ☁{summary.cloudyDays} ☂{summary.rainyDays}
                    </SummaryCaption>
                  </SummaryCard>
                </SummaryGrid>
              </>
            )}

            {/* 気温推移チャート */}
            <SectionLabel>📈 気温・降水量チャート</SectionLabel>
            <div
              style={{
                marginBottom: 24,
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid var(--color-border, #e5e7eb)',
              }}
            >
              <WeatherTemperatureChart daily={daily} year={year} month={month} />
            </div>

            {/* 日別天気グリッド */}
            <SectionLabel>🗓 日別天気（タップで時間帯詳細）</SectionLabel>
            <Grid variants={staggerContainer} initial="initial" animate="animate">
              {daily.map((d) => {
                const dayNum = Number(d.dateKey.split('-')[2])
                const dow = new Date(year, month - 1, dayNum).getDay()
                return (
                  <DayCell
                    key={d.dateKey}
                    variants={staggerItem}
                    $active={modalDate === d.dateKey}
                    onClick={() => handleDayClick(d.dateKey)}
                    layout
                  >
                    <DayLabelText $weekend={dow === 0 || dow === 6}>
                      {dayNum}({DOW_LABELS[dow]})
                    </DayLabelText>
                    <WeatherBadge
                      weatherCode={d.dominantWeatherCode}
                      temperature={d.temperatureAvg}
                      temperatureMax={d.temperatureMax}
                      temperatureMin={d.temperatureMin}
                      compact
                    />
                  </DayCell>
                )
              })}
            </Grid>

            {/* 予報グリッド */}
            {futureForecasts.length > 0 && (
              <>
                <SectionLabel>🔮 予報</SectionLabel>
                <Grid variants={staggerContainer} initial="initial" animate="animate">
                  {futureForecasts.map((f) => {
                    const dayNum = Number(f.dateKey.split('-')[2])
                    return (
                      <ForecastCell
                        key={f.dateKey}
                        variants={staggerItem}
                        $active={modalDate === f.dateKey}
                        onClick={() => handleForecastClick(f)}
                      >
                        <DayLabelText>{dayNum}日</DayLabelText>
                        <ForecastBadge forecast={f} compact />
                      </ForecastCell>
                    )
                  })}
                </Grid>
              </>
            )}

            {/* 日別詳細テーブル */}
            <SectionLabel>📋 日別詳細データ</SectionLabel>
            <TableWrapper>
              <DetailTable>
                <thead>
                  <tr>
                    <th>日付</th>
                    <th>天気</th>
                    <th>平均</th>
                    <th>最高</th>
                    <th>最低</th>
                    <th>降水量</th>
                    <th>湿度</th>
                    <th>風速</th>
                    <th>日照</th>
                    <th style={{ textAlign: 'left' }}>天気概況</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.map((d) => {
                    const dayNum = Number(d.dateKey.split('-')[2])
                    const dow = new Date(year, month - 1, dayNum).getDay()
                    const cat = categorizeWeatherCode(d.dominantWeatherCode)
                    const precipPct = (d.precipitationTotal / maxPrecip) * 60
                    return (
                      <tr
                        key={d.dateKey}
                        onClick={() => handleDayClick(d.dateKey)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td style={{ color: dow === 0 || dow === 6 ? '#ef4444' : undefined }}>
                          {dayNum}({DOW_LABELS[dow]})
                        </td>
                        <td style={{ textAlign: 'center', fontSize: '1rem' }}>
                          {WEATHER_ICONS[cat]}
                        </td>
                        <td>{d.temperatureAvg.toFixed(1)}°</td>
                        <td style={{ color: '#ef4444' }}>{d.temperatureMax.toFixed(1)}°</td>
                        <td style={{ color: '#3b82f6' }}>{d.temperatureMin.toFixed(1)}°</td>
                        <td>
                          {d.precipitationTotal > 0 && <PrecipBar $pct={precipPct} />}
                          {d.precipitationTotal.toFixed(1)}
                        </td>
                        <td>{d.humidityAvg.toFixed(0)}%</td>
                        <td>{d.windSpeedMax.toFixed(1)}m/s</td>
                        <td>{d.sunshineTotalHours.toFixed(1)}h</td>
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
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </DetailTable>
            </TableWrapper>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 時間帯モーダル */}
      {modalDate && showModal && (
        <HourlyWeatherModal
          dateKey={modalDate}
          records={modalHourly?.status === 'done' ? modalHourly.records : undefined}
          prevYearRecords={modalPrevHourly?.status === 'done' ? modalPrevHourly.records : undefined}
          prevYearDateKey={modalPrevDate?.dateKey}
          comparisonPolicy="sameDate"
          forecast={modalForecast ?? undefined}
          onClose={() => {
            setModalDate(null)
            setModalForecast(null)
          }}
        />
      )}
    </Page>
  )
})
