/**
 * WeatherPage — 過去の天気データ閲覧ページ
 *
 * 売上データなしで単独表示可能。ETRN（気象庁過去の気象データ検索）から
 * 月別の日別天気データを取得し、詳細な気象情報を閲覧する。
 *
 * サマリー: グラフ未選択 → 月間、日クリック → その日の詳細+前年比較
 * グラフ: 天気アイコン統合、クリックで時間帯モーダル起動
 * 日別グリッド不要（チャートに統合済み）
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
import { WeatherDetailSection } from './WeatherDetailSection'
import { WeatherSummarySection } from './WeatherSummarySection'
import { computeMonthSummary, computeDaySummary, type WeatherSummaryResult } from './weatherSummary'
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

  const [selectedDays, setSelectedDays] = useState<ReadonlySet<number>>(new Set())
  const [uiState, setUiState] = useState<{
    modalDate: string | null
    modalForecast: DailyForecast | null
  }>({ modalDate: null, modalForecast: null })

  // 比較スコープ（ヘッダーと同じ alignmentPolicy を使用）
  const alignmentPolicy = useSettingsStore((s) => s.settings.alignmentPolicy)
  const comparisonScope = useComparisonScope(year, month, alignmentPolicy)

  // 月ナビ
  const goPrev = useCallback(() => {
    setSelectedDays(new Set())
    setMonth((m) => {
      if (m === 1) {
        setYear((y) => y - 1)
        return 12
      }
      return m - 1
    })
  }, [setYear])
  const goNext = useCallback(() => {
    setSelectedDays(new Set())
    setMonth((m) => {
      if (m === 12) {
        setYear((y) => y + 1)
        return 1
      }
      return m + 1
    })
  }, [setYear])

  // スクロールによる月シフト
  const handleMonthScroll = useCallback(
    (direction: -1 | 1) => {
      setSelectedDays(new Set())
      if (direction === -1) goPrev()
      else goNext()
    },
    [goPrev, goNext],
  )

  // シングルクリック → トグル選択
  const handleChartDayClick = useCallback((dateKey: string) => {
    const dayNum = Number(dateKey.split('-')[2])
    setSelectedDays((prev) => {
      const next = new Set(prev)
      if (next.has(dayNum)) next.delete(dayNum)
      else next.add(dayNum)
      return next
    })
  }, [])

  // ドラッグ範囲選択
  const handleDayRangeSelect = useCallback((startDay: number, endDay: number) => {
    const next = new Set<number>()
    for (let d = startDay; d <= endDay; d++) next.add(d)
    setSelectedDays(next)
  }, [])

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
    if (selectedDays.size === 1) {
      const day = [...selectedDays][0]
      const d = daily.find((r) => Number(r.dateKey.split('-')[2]) === day)
      return d ? computeDaySummary(d) : null
    }
    const filtered = daily.filter((r) => selectedDays.has(Number(r.dateKey.split('-')[2])))
    return computeMonthSummary(filtered)
  }, [daily, selectedDays])

  const prevDaySummary = useMemo<WeatherSummaryResult | null>(() => {
    if (selectedDays.size === 0) return null
    if (selectedDays.size === 1) {
      const day = [...selectedDays][0]
      const d = prevYearCurrentMonth.find((r) => Number(r.dateKey.split('-')[2]) === day)
      return d ? computeDaySummary(d) : null
    }
    const filtered = prevYearCurrentMonth.filter((r) =>
      selectedDays.has(Number(r.dateKey.split('-')[2])),
    )
    return computeMonthSummary(filtered)
  }, [prevYearCurrentMonth, selectedDays])

  // 予報分離
  const observedKeys = useMemo(() => new Set(daily.map((d) => d.dateKey)), [daily])
  const futureForecasts = useMemo(
    () => forecasts.filter((f) => !observedKeys.has(f.dateKey)),
    [forecasts, observedKeys],
  )

  // モーダル
  const modalHourly = uiState.modalDate ? hourlyCache[uiState.modalDate] : undefined
  const modalPrevHourly = uiState.modalDate ? prevHourlyCache[uiState.modalDate] : undefined
  const modalPrevDate = uiState.modalDate ? resolvePrevDate(uiState.modalDate) : null
  const showModal =
    uiState.modalDate &&
    ((modalHourly?.status === 'done' && modalHourly.records.length > 0) ||
      (uiState.modalForecast &&
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

            {/* サマリー: 月間（常時） + 選択日（日クリック時に並列表示） */}
            <AnimatePresence mode="wait">
              {monthSummary && (
                <motion.div
                  key="summary"
                  variants={fadeSlideVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.2 }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: selectedDaySummary ? '1fr 1fr' : '1fr',
                      gap: 24,
                      marginBottom: 16,
                    }}
                  >
                    <WeatherSummarySection
                      summary={monthSummary}
                      prevSummary={prevMonthSummary}
                      label="月間サマリ"
                    />
                    {selectedDaySummary && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.25 }}
                      >
                        <WeatherSummarySection
                          summary={selectedDaySummary}
                          prevSummary={prevDaySummary}
                          label={
                            selectedDays.size === 1
                              ? `${month}月${[...selectedDays][0]}日`
                              : `選択: ${selectedDays.size}日間`
                          }
                        />
                        <NavBtn
                          onClick={() => setSelectedDays(new Set())}
                          style={{ fontSize: '0.7rem' }}
                        >
                          ✕ 選択解除
                        </NavBtn>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 気温推移チャート（天気アイコン統合、クリックで時間帯モーダル） */}
            <SectionLabel>📈 気温チャート（ダブルクリックで時間帯詳細）</SectionLabel>
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
              daily={daily}
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
