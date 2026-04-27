/**
 * 時間帯別売上チャート（HourlyChart）
 *
 * DayDetailModal の「時間帯分析」タブで表示する
 * 棒グラフ・累積線・時間帯別詳細パネルを提供する。
 * 複数時間帯を選択して分類別内訳を表示可能。
 *
 * @responsibility R:unclassified
 */
import { memo, useState, useMemo, useCallback, useRef, useEffect } from 'react'
import type { HourlyWeatherRecord } from '@/domain/models/record'
import type { CategoryLeafDailyEntry } from '@/application/hooks/categoryLeafDaily/CategoryLeafDailyBundle.types'
import type { TimeSlotSeries } from '@/application/hooks/timeSlot/TimeSlotBundle.types'
import { toComma } from '@/presentation/components/charts/chartTheme'
import { formatPercent } from '@/domain/formatting'
import { calculateShare } from '@/domain/calculations/utils'
import {
  formatCoreTime,
  formatTurnaroundHour,
} from '@/presentation/components/charts/timeSlotUtils'
import { DetailSectionTitle } from '../DashboardPage.styles'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { buildCumulativeData } from './HourlyChart.logic'
import {
  buildHourlyDataSets,
  buildPaddedDataSets,
  buildSelectedDetail,
  buildWeatherHourlyMap,
  buildHourlySummaryStats,
  formatSelectedHoursLabel,
} from './HourlyChart.builders'
import {
  HourlySection,
  HourlyChartContainer,
  HourlyChartWrap,
  HourlyBarArea,
  HourlyCumOverlay,
  HourlyRightAxis,
  HourlyBar,
  HourlyAxis,
  HourlyTick,
  HourlyTooltipBox,
  HourlySummaryRow,
  HourlySumItem,
  HourlyDetailPanel,
  HourlyDetailHeader,
  HourlyDetailTitle,
  HourlyDetailClose,
  HourlyDetailSummary,
  ToggleBar,
  ToggleGroup,
  ToggleBtn,
  ToggleLabel,
  SumLabel,
  SumValue,
  LegendDot,
  DrillTable,
  DTh,
  DTr,
  DTd,
  DTdName,
  DTdAmt,
  AmtWrap,
  AmtTrack,
  AmtFill,
  AmtVal,
} from './DayDetailModal.styles'
import { WeatherTempLine, WeatherIconRow, WeatherTooltipInfo } from './HourlyWeatherOverlay'
import { HourlyYoYSummary, WeatherSummaryRow } from './HourlyYoYSummary'

type HourlyMode = 'actual' | 'prev'

export const HourlyChart = memo(function HourlyChart({
  dayRecords,
  prevDayRecords,
  currentSeries,
  comparisonSeries,
  weatherHourly,
  prevWeatherHourly,
  prevDateKey,
  curDateKey,
}: {
  /** leaf-grain 用 raw CTS（カテゴリ別内訳パネルで使用）*/
  dayRecords: readonly CategoryLeafDailyEntry[]
  prevDayRecords: readonly CategoryLeafDailyEntry[]
  /** 時間帯集計 series（timeSlotLane.bundle 由来）— amount / quantity 合算源 */
  currentSeries: TimeSlotSeries | null
  comparisonSeries: TimeSlotSeries | null
  weatherHourly?: readonly HourlyWeatherRecord[]
  prevWeatherHourly?: readonly HourlyWeatherRecord[]
  prevDateKey?: string
  curDateKey?: string
}) {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null)
  const [selectedHours, setSelectedHours] = useState<Set<number>>(new Set())
  const [hourlyMode, setHourlyMode] = useState<HourlyMode>('actual')

  // 3 useMemo → 1: actualData + prevData + allHours を一括構築
  const dataSets = useMemo(
    () => buildHourlyDataSets(currentSeries, comparisonSeries),
    [currentSeries, comparisonSeries],
  )
  const { actualData: actualHourlyData, prevData: prevHourlyData, allHours } = dataSets

  const hasPrevData = prevHourlyData.length > 0
  // 当年データの有無: amount 合計 > 0 で判定 (配列が空 or 全日 0 なら欠損扱い)
  const hasActualData = actualHourlyData.length > 0 && actualHourlyData.some((d) => d.amount > 0)
  const hourlyData = hourlyMode === 'prev' && hasPrevData ? prevHourlyData : actualHourlyData
  const refData = hourlyMode === 'actual' ? prevHourlyData : actualHourlyData
  const displayWeatherHourly =
    hourlyMode === 'prev' && hasPrevData ? prevWeatherHourly : weatherHourly

  // 2 useMemo → 1: paddedData + paddedRef を一括構築
  const { paddedData, paddedRef } = useMemo(
    () => buildPaddedDataSets(hourlyData, refData, allHours),
    [hourlyData, refData, allHours],
  )

  // Toggle hour selection (multi-select)
  const toggleHour = useCallback((hour: number) => {
    setSelectedHours((prev) => {
      const next = new Set(prev)
      if (next.has(hour)) {
        next.delete(hour)
      } else {
        next.add(hour)
      }
      return next
    })
  }, [])

  // Select all / clear all
  const selectAllHours = useCallback(() => {
    setSelectedHours(new Set(paddedData.map((d) => d.hour)))
  }, [paddedData])

  const clearSelection = useCallback(() => {
    setSelectedHours(new Set())
  }, [])

  // 2 useMemo → 1: selectedData + hourDetail を一括構築
  const { selectedData, hourDetail } = useMemo(
    () => buildSelectedDetail(selectedHours, paddedData, dayRecords, prevDayRecords, hourlyMode),
    [selectedHours, paddedData, dayRecords, prevDayRecords, hourlyMode],
  )

  const totalAmt = paddedData.reduce((s, d) => s + d.amount, 0)

  const cumData = useMemo(() => buildCumulativeData(paddedData, totalAmt), [paddedData, totalAmt])

  const n = paddedData.length

  // ── ResizeObserver で実ピクセルサイズを取得 ──
  const wrapRef = useRef<HTMLDivElement>(null)
  const [chartW, setChartW] = useState(0)
  const [chartH, setChartH] = useState(0)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => {
      setChartW(e.contentRect.width)
      setChartH(e.contentRect.height)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // ピクセル座標ヘルパー
  const pxX = useCallback(
    (i: number) => (n > 0 ? ((i + 0.5) / n) * chartW : chartW / 2),
    [n, chartW],
  )
  const pxY = useCallback((pct: number) => chartH * (1 - pct / 100), [chartH])

  // ── 天気データマップ（ツールチップ用） ──
  const weatherMap = useMemo(
    () => buildWeatherHourlyMap(displayWeatherHourly),
    [displayWeatherHourly],
  )

  if (paddedData.length === 0 && prevHourlyData.length === 0) return null
  if (paddedData.length === 0) return null

  const { maxAmt, totalQty, peakHour, coreTime, turnaroundHour } =
    buildHourlySummaryStats(paddedData)

  const cumLinePoints = cumData.map((d, i) => `${pxX(i)},${pxY(d.cumPct)}`).join(' ')

  const modeLabel = hourlyMode === 'prev' ? '前年' : '実績'

  const selectedLabel = formatSelectedHoursLabel(selectedHours)

  return (
    <HourlySection>
      <DetailSectionTitle>時間帯別売上</DetailSectionTitle>
      {hasPrevData && (
        <ToggleBar style={{ marginBottom: 8 }}>
          <ToggleLabel>データ</ToggleLabel>
          <ToggleGroup>
            <ToggleBtn
              $active={hourlyMode === 'actual'}
              onClick={() => {
                setHourlyMode('actual')
                setSelectedHours(new Set())
              }}
            >
              実績（当年）
            </ToggleBtn>
            <ToggleBtn
              $active={hourlyMode === 'prev'}
              onClick={() => {
                setHourlyMode('prev')
                setSelectedHours(new Set())
              }}
            >
              前年
            </ToggleBtn>
          </ToggleGroup>
        </ToggleBar>
      )}
      <HourlySummaryRow>
        <HourlySumItem>
          <SumLabel>{modeLabel}合計</SumLabel>
          <SumValue>{toComma(totalAmt)}円</SumValue>
        </HourlySumItem>
        <HourlySumItem>
          <SumLabel>合計点数</SumLabel>
          <SumValue>{totalQty.toLocaleString()}点</SumValue>
        </HourlySumItem>
        <HourlySumItem>
          <SumLabel>ピーク</SumLabel>
          <SumValue>
            {peakHour.hour}時（{toComma(peakHour.amount)}円）
          </SumValue>
        </HourlySumItem>
        <HourlySumItem>
          <SumLabel>コアタイム</SumLabel>
          <SumValue>{formatCoreTime(coreTime)}</SumValue>
        </HourlySumItem>
        <HourlySumItem>
          <SumLabel>折り返し</SumLabel>
          <SumValue>{formatTurnaroundHour(turnaroundHour)}</SumValue>
        </HourlySumItem>
      </HourlySummaryRow>

      {/* 天気サマリ行 */}
      {weatherHourly && weatherHourly.length > 0 && (
        <WeatherSummaryRow
          weatherHourly={weatherHourly}
          prevWeatherHourly={prevWeatherHourly}
          curDateKey={curDateKey}
          prevDateKey={prevDateKey}
        />
      )}

      {/* Multi-select hint & controls */}
      <ToggleBar style={{ marginBottom: 4 }}>
        <ToggleLabel>時間帯選択</ToggleLabel>
        <ToggleGroup>
          <ToggleBtn $active={false} onClick={selectAllHours}>
            全選択
          </ToggleBtn>
          <ToggleBtn $active={false} onClick={clearSelection}>
            クリア
          </ToggleBtn>
        </ToggleGroup>
        {selectedHours.size > 0 && (
          <span style={{ fontSize: '0.6rem', opacity: 0.7, marginLeft: 4 }}>
            選択中: {selectedLabel}
          </span>
        )}
      </ToggleBar>

      <HourlyChartContainer
        style={
          hourlyMode === 'actual' && !hasActualData
            ? { filter: 'grayscale(1)', opacity: 0.45, position: 'relative' }
            : undefined
        }
        aria-disabled={hourlyMode === 'actual' && !hasActualData}
      >
        {hourlyMode === 'actual' && !hasActualData && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
              pointerEvents: 'none',
              fontSize: '0.85rem',
              color: 'var(--text2, #64748b)',
              background: 'rgba(255,255,255,0.35)',
              textAlign: 'center',
              padding: 16,
            }}
            role="status"
          >
            当年の実績がまだありません — 時間帯分析できません
          </div>
        )}
        <HourlyChartWrap ref={wrapRef}>
          <HourlyBarArea>
            {paddedData.map((d, idx) => {
              const pct = (d.amount / maxAmt) * 100
              const isPeak = d.hour === peakHour.hour
              const isSelected = selectedHours.has(d.hour)
              const isCoreTime =
                coreTime != null && d.hour >= coreTime.startHour && d.hour <= coreTime.endHour
              const isTurnaround = d.hour === turnaroundHour
              const cumEntry = cumData.find((c) => c.hour === d.hour)
              const refEntry = paddedRef[idx]
              const refPct = refEntry ? (refEntry.amount / maxAmt) * 100 : 0
              const barColor = isSelected
                ? palette.pinkDark
                : isPeak
                  ? palette.warningDark
                  : isCoreTime
                    ? palette.purpleDark
                    : palette.primary
              return (
                <HourlyBar
                  key={d.hour}
                  data-hourly-bar
                  $pct={pct}
                  $color={barColor}
                  onMouseEnter={() => setHoveredHour(d.hour)}
                  onMouseLeave={() => setHoveredHour(null)}
                  onClick={() => toggleHour(d.hour)}
                  style={{
                    outline: isSelected
                      ? `2px solid ${palette.pinkDark}`
                      : isTurnaround
                        ? `2px solid ${palette.dangerDark}`
                        : undefined,
                    outlineOffset: -1,
                  }}
                >
                  {hasPrevData && refPct > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: `${Math.max(refPct, 1)}%`,
                        borderTop: '2px dashed rgba(255,255,255,0.6)',
                        pointerEvents: 'none',
                      }}
                    />
                  )}
                  {hoveredHour === d.hour && !isSelected && (
                    <HourlyTooltipBox>
                      <div style={{ fontWeight: 600, marginBottom: 2 }}>
                        {d.hour}時 ({modeLabel})
                      </div>
                      <div>
                        {toComma(d.amount)}円 / {d.quantity.toLocaleString()}点
                      </div>
                      {hasPrevData && refEntry && (
                        <div style={{ opacity: 0.7 }}>
                          {hourlyMode === 'actual' ? '前年' : '実績'}: {toComma(refEntry.amount)}円
                        </div>
                      )}
                      <div>累積率 {cumEntry ? cumEntry.cumPct.toFixed(1) : '0.0'}%</div>
                      {weatherMap?.get(d.hour) && (
                        <WeatherTooltipInfo weather={weatherMap.get(d.hour)!} />
                      )}
                      <span style={{ fontSize: '0.42rem', opacity: 0.6 }}>
                        クリックで選択（複数可）
                      </span>
                    </HourlyTooltipBox>
                  )}
                </HourlyBar>
              )
            })}
          </HourlyBarArea>
          {chartW > 0 && chartH > 0 && (
            <HourlyCumOverlay width={chartW} height={chartH}>
              {[25, 50, 75].map((g) => (
                <line
                  key={g}
                  x1="0"
                  y1={pxY(g)}
                  x2={chartW}
                  y2={pxY(g)}
                  stroke="currentColor"
                  strokeWidth="0.5"
                  strokeDasharray="3,3"
                  opacity="0.3"
                />
              ))}
              <polyline
                points={cumLinePoints}
                fill="none"
                stroke={sc.negative}
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {cumData.map((d, i) => (
                <circle key={d.hour} cx={pxX(i)} cy={pxY(d.cumPct)} r="3.5" fill={sc.negative} />
              ))}
              {displayWeatherHourly && displayWeatherHourly.length > 0 && (
                <WeatherTempLine
                  hours={paddedData}
                  weatherHourly={displayWeatherHourly}
                  chartW={chartW}
                  chartH={chartH}
                  pxX={pxX}
                />
              )}
            </HourlyCumOverlay>
          )}
        </HourlyChartWrap>
        <HourlyRightAxis>
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
        </HourlyRightAxis>
      </HourlyChartContainer>
      <HourlyAxis>
        {paddedData.map((d) => (
          <HourlyTick
            key={d.hour}
            style={{
              fontWeight: selectedHours.has(d.hour) ? 700 : 400,
              color: selectedHours.has(d.hour) ? palette.pinkDark : undefined,
            }}
          >
            {d.hour}
          </HourlyTick>
        ))}
      </HourlyAxis>
      {/* 天気アイコン行 */}
      {displayWeatherHourly && displayWeatherHourly.length > 0 && (
        <WeatherIconRow hours={paddedData} weatherHourly={displayWeatherHourly} />
      )}

      {/* 時間帯別前年比サマリ */}
      {hasPrevData && hourlyMode === 'actual' && (
        <HourlyYoYSummary
          actualData={actualHourlyData}
          prevData={prevHourlyData}
          weatherHourly={weatherHourly}
          prevWeatherHourly={prevWeatherHourly}
          prevDateKey={prevDateKey}
          curDateKey={curDateKey}
        />
      )}

      {selectedHours.size > 0 && selectedData && (
        <HourlyDetailPanel>
          <HourlyDetailHeader>
            <HourlyDetailTitle>{selectedLabel}の分類別内訳</HourlyDetailTitle>
            <HourlyDetailClose onClick={clearSelection}>閉じる</HourlyDetailClose>
          </HourlyDetailHeader>
          <HourlyDetailSummary>
            <HourlySumItem>
              <SumLabel>選択時間合計</SumLabel>
              <SumValue>{toComma(selectedData.amount)}円</SumValue>
            </HourlySumItem>
            <HourlySumItem>
              <SumLabel>点数</SumLabel>
              <SumValue>{selectedData.quantity.toLocaleString()}点</SumValue>
            </HourlySumItem>
            <HourlySumItem>
              <SumLabel>全体比</SumLabel>
              <SumValue>{formatPercent(calculateShare(selectedData.amount, totalAmt), 2)}</SumValue>
            </HourlySumItem>
            <HourlySumItem>
              <SumLabel>分類数</SumLabel>
              <SumValue>{hourDetail.length}</SumValue>
            </HourlySumItem>
          </HourlyDetailSummary>
          {hourDetail.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <DrillTable>
                <thead>
                  <tr>
                    <DTh>#</DTh>
                    <DTh>部門</DTh>
                    <DTh>ライン</DTh>
                    <DTh>クラス</DTh>
                    <DTh>売上金額</DTh>
                    <DTh>点数</DTh>
                    <DTh>構成比</DTh>
                  </tr>
                </thead>
                <tbody>
                  {hourDetail.map((it, i) => (
                    <DTr key={`${it.dept}-${it.line}-${it.klass}`} $clickable={false}>
                      <DTd $mono>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <LegendDot $color={it.color} />
                          {i + 1}
                        </span>
                      </DTd>
                      <DTdName>{it.dept}</DTdName>
                      <DTd>{it.line}</DTd>
                      <DTd>{it.klass}</DTd>
                      <DTdAmt>
                        <AmtWrap>
                          <AmtTrack>
                            <AmtFill $pct={it.pct} $color={it.color} />
                          </AmtTrack>
                          <AmtVal>{toComma(it.amount)}円</AmtVal>
                        </AmtWrap>
                      </DTdAmt>
                      <DTd $mono>{it.quantity.toLocaleString()}点</DTd>
                      <DTd $mono>{it.pct.toFixed(2)}%</DTd>
                    </DTr>
                  ))}
                </tbody>
              </DrillTable>
            </div>
          )}
        </HourlyDetailPanel>
      )}
    </HourlySection>
  )
})
