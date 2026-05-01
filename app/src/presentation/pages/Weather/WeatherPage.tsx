/**
 * WeatherPage — 過去の天気データ閲覧ページ
 *
 * 売上データなしで単独表示可能。ETRN（気象庁過去の気象データ検索）から
 * 月別の日別天気データを取得し、詳細な気象情報を閲覧する。
 *
 * サマリー: グラフ未選択 → 月間、日クリック → その日の詳細+前年比較
 * グラフ: 天気アイコン統合、クリックで時間帯モーダル起動
 * 日別グリッド不要（チャートに統合済み）
 *
 * @responsibility R:unclassified
 */
import { memo, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useDataStore } from '@/application/stores/dataStore'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useWeatherTriple } from '@/application/hooks/useWeatherTriple'
import { useWeatherForecast } from '@/application/hooks/useWeatherForecast'
import { useWeatherHourlyOnDemand } from '@/application/hooks/useWeatherHourlyOnDemand'
import { useComparisonScope } from '@/features/comparison'
import type { DailyForecast, StoreLocation } from '@/domain/models/record'
import { ForecastBadge } from '@/presentation/components/common/ForecastBadge'
import { HourlyWeatherModal } from '@/presentation/pages/Dashboard/widgets/HourlyWeatherModal'
import { WeatherTemperatureChart } from './WeatherTemperatureChart'
import { InlineLocationSetup } from './InlineLocationSetup'
import { DowPresetSelector } from '@/presentation/components/charts/DowPresetSelector'
import { WeatherDetailSection } from './WeatherDetailSection'
import { WeatherSummarySection } from './WeatherSummarySection'
import { computeMonthSummary, computeDaySummary, type WeatherSummaryResult } from './weatherSummary'
import { useWeatherDaySelection } from './useWeatherDaySelection'
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
  ForecastCell,
  DayLabelText,
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

// ── Main Page ──

export const WeatherPage = memo(function WeatherPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  const currentMonthData = useDataStore((s) => s.currentMonthData)
  const storeLocations = useSettingsStore((s) => s.settings.storeLocations)
  const updateSettings = useSettingsStore((s) => s.updateSettings)

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

  // 3ヶ月天気データ取得（前月+当月+翌月 + 前年）
  const weatherTriple = useWeatherTriple(year, month, selectedStoreId)
  const {
    combined,
    prevYearCombined,
    boundaries,
    currentMonthDaily: daily,
    isLoading,
    reload,
  } = weatherTriple
  const error = null // useWeatherTriple doesn't expose individual errors yet
  const { forecasts } = useWeatherForecast(selectedStoreId)
  const { hourlyCache, prevHourlyCache, fetchHourly, fetchPrevHourly, resolvePrevDate } =
    useWeatherHourlyOnDemand(selectedStoreId, 'sameDate')

  // 日選択・ナビゲーション状態（sub-hook に抽出済み）
  const daySelection = useWeatherDaySelection(daily, combined, year, month, setYear, setMonth)
  const {
    selectedDays,
    setSelectedDays,
    selectedDows,
    handleDowChange,
    filteredDaily,
    goPrev,
    goNext,
    handleMonthScroll,
    handleChartDayClick,
    handleDayRangeSelect,
    selectedDayNumbers,
  } = daySelection

  const [uiState, setUiState] = useState<{
    modalDate: string | null
    modalForecast: DailyForecast | null
  }>({ modalDate: null, modalForecast: null })

  // 比較スコープ（ヘッダーと同じ alignmentPolicy を使用）
  const alignmentPolicy = useSettingsStore((s) => s.settings.alignmentPolicy)
  const comparisonScope = useComparisonScope(year, month, alignmentPolicy)

  // ダブルクリック → 時間帯モーダル起動
  const handleChartDayDblClick = useCallback(
    (dateKey: string) => {
      setUiState((s) => ({ ...s, modalDate: dateKey, modalForecast: null }))

      fetchHourly(dateKey, year, month)
      fetchPrevHourly(dateKey)
    },
    [year, month, fetchHourly, fetchPrevHourly],
  )

  const handleForecastClick = useCallback(
    (f: DailyForecast) => {
      setUiState((s) => ({ ...s, modalDate: f.dateKey, modalForecast: f }))

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

  // 当月の前年データ（comparisonScope の日付範囲でフィルタ）
  const prevYearCurrentMonth = useMemo(() => {
    if (!comparisonScope) return []
    const { from, to } = comparisonScope.dateRange
    const fromKey = `${from.year}-${String(from.month).padStart(2, '0')}-${String(from.day).padStart(2, '0')}`
    const toKey = `${to.year}-${String(to.month).padStart(2, '0')}-${String(to.day).padStart(2, '0')}`
    return prevYearCombined.filter((d) => d.dateKey >= fromKey && d.dateKey <= toKey)
  }, [comparisonScope, prevYearCombined])

  // サマリー: 選択日 or 月間
  const monthSummary = useMemo(() => computeMonthSummary(daily), [daily])
  const prevMonthSummary = useMemo(
    () => computeMonthSummary(prevYearCurrentMonth),
    [prevYearCurrentMonth],
  )

  const selectedDaySummary = useMemo<WeatherSummaryResult | null>(() => {
    if (selectedDays.size === 0) return null
    // combined（3ヶ月）から dateKey で検索
    const allDaily = combined.length > 0 ? combined : daily
    if (selectedDays.size === 1) {
      const dk = [...selectedDays][0]
      const d = allDaily.find((r) => r.dateKey === dk)
      return d ? computeDaySummary(d) : null
    }
    const filtered = allDaily.filter((r) => selectedDays.has(r.dateKey))
    return computeMonthSummary(filtered)
  }, [combined, daily, selectedDays])

  const prevDaySummary = useMemo<WeatherSummaryResult | null>(() => {
    if (selectedDayNumbers.size === 0) return null
    if (selectedDayNumbers.size === 1) {
      const day = [...selectedDayNumbers][0]
      const d = prevYearCurrentMonth.find((r) => Number(r.dateKey.split('-')[2]) === day)
      return d ? computeDaySummary(d) : null
    }
    const filtered = prevYearCurrentMonth.filter((r) =>
      selectedDayNumbers.has(Number(r.dateKey.split('-')[2])),
    )
    return computeMonthSummary(filtered)
  }, [prevYearCurrentMonth, selectedDayNumbers])

  // 予報分離（observed を内包して 1 useMemo に統合）
  const futureForecasts = useMemo(() => {
    const observed = new Set(daily.map((d) => d.dateKey))
    return forecasts.filter((f) => !observed.has(f.dateKey))
  }, [daily, forecasts])

  // モーダル
  const modalHourly = uiState.modalDate ? hourlyCache[uiState.modalDate] : undefined
  const modalPrevHourly = uiState.modalDate ? prevHourlyCache[uiState.modalDate] : undefined
  const modalPrevDate = uiState.modalDate ? resolvePrevDate(uiState.modalDate) : null
  // モーダルは dateKey があれば即表示（中身はローディング → データ到着で更新）
  const showModal = !!uiState.modalDate

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

        {location && isLoading && daily.length === 0 && (
          <LoadingBox key="loading">
            <Spinner />
            <span>
              {year}年{month}月の天気データを取得中...
            </span>
          </LoadingBox>
        )}

        {location && error && <ErrorText key="error">{error}</ErrorText>}

        {location && daily.length > 0 && (
          <motion.div
            key={`${year}-${month}`}
            variants={fadeSlideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={fadeTransition}
          >
            {/* 比較モード表示（ヘッダーの設定に連動） */}
            {comparisonScope && (
              <StationBadge style={{ marginBottom: 8, display: 'inline-block' }}>
                比較: {alignmentPolicy === 'sameDayOfWeek' ? '前年同曜日' : '前年同日'}
                {comparisonScope.dowOffset > 0 && ` (${comparisonScope.dowOffset}日ずれ)`}
              </StationBadge>
            )}

            {/* サマリー: 月間 ↔ 日別（チャートクリックでインプレース切替） */}
            <AnimatePresence mode="wait">
              {(selectedDaySummary ?? monthSummary) && (
                <motion.div
                  key={selectedDaySummary ? 'day' : 'month'}
                  variants={fadeSlideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.2 }}
                  style={{ marginBottom: 16 }}
                >
                  <WeatherSummarySection
                    summary={selectedDaySummary ?? monthSummary!}
                    prevSummary={selectedDaySummary ? prevDaySummary : prevMonthSummary}
                    label={
                      selectedDaySummary
                        ? selectedDays.size === 1
                          ? (() => {
                              const dk = [...selectedDays][0]
                              const m = Number(dk.split('-')[1])
                              const d = Number(dk.split('-')[2])
                              return `${m}月${d}日`
                            })()
                          : `選択: ${selectedDays.size}日間`
                        : '月間サマリ'
                    }
                  />
                  {selectedDaySummary && (
                    <NavBtn
                      onClick={() => setSelectedDays(new Set())}
                      style={{ fontSize: '0.7rem', marginTop: 4 }}
                    >
                      ✕ 月間サマリに戻す
                    </NavBtn>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* 気温推移チャート（天気アイコン統合、クリックで時間帯モーダル） */}
            <SectionLabel>🌡 気温チャート（ダブルクリックで時間帯詳細）</SectionLabel>
            <div style={{ marginBottom: 24 }}>
              <WeatherTemperatureChart
                daily={combined}
                prevYearDaily={prevYearCombined.length > 0 ? prevYearCombined : undefined}
                selectedDays={selectedDays}
                onDayClick={handleChartDayClick}
                onDayDblClick={handleChartDayDblClick}
                onDayRangeSelect={handleDayRangeSelect}
                monthBoundaries={boundaries}
                onMonthChange={handleMonthScroll}
                headerExtra={
                  <DowPresetSelector selectedDows={selectedDows} onChange={handleDowChange} />
                }
              />
            </div>

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
                        $active={uiState.modalDate === f.dateKey}
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

            {/* 日別詳細 — テーブル / カレンダー切替 + 曜日フィルタ */}
            <WeatherDetailSection
              daily={filteredDaily}
              prevYearDaily={prevYearCurrentMonth}
              year={year}
              month={month}
              selectedDays={selectedDays}
              onDayClick={handleChartDayClick}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {uiState.modalDate && showModal && (
        <HourlyWeatherModal
          dateKey={uiState.modalDate}
          records={modalHourly?.status === 'done' ? modalHourly.records : undefined}
          prevYearRecords={modalPrevHourly?.status === 'done' ? modalPrevHourly.records : undefined}
          prevYearDateKey={modalPrevDate?.dateKey}
          comparisonPolicy="sameDate"
          forecast={uiState.modalForecast ?? undefined}
          onClose={() => setUiState((s) => ({ ...s, modalDate: null, modalForecast: null }))}
        />
      )}
    </Page>
  )
})
