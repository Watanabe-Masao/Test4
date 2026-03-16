/**
 * 時間帯別売上チャート（HourlyChart）
 *
 * DayDetailModal の「時間帯分析」タブで表示する
 * 棒グラフ・累積線・時間帯別詳細パネルを提供する。
 * 複数時間帯を選択して分類別内訳を表示可能。
 */
import { memo, useState, useMemo, useCallback, useRef, useEffect } from 'react'
import type { CategoryTimeSalesRecord } from '@/domain/models'
import { toComma } from '@/presentation/components/charts/chartTheme'
import { formatPercent } from '@/domain/formatting'
import { calculateShare } from '@/domain/calculations/utils'
import {
  findCoreTime,
  findTurnaroundHour,
  buildHourlyMap,
  formatCoreTime,
  formatTurnaroundHour,
} from '@/presentation/components/charts/timeSlotUtils'
import { DetailSectionTitle } from '../DashboardPage.styles'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { COLORS, type HourCategoryItem } from './drilldownUtils'
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

type HourlyMode = 'actual' | 'prev'

export const HourlyChart = memo(function HourlyChart({
  dayRecords,
  prevDayRecords,
}: {
  dayRecords: readonly CategoryTimeSalesRecord[]
  prevDayRecords: readonly CategoryTimeSalesRecord[]
}) {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null)
  const [selectedHours, setSelectedHours] = useState<Set<number>>(new Set())
  const [hourlyMode, setHourlyMode] = useState<HourlyMode>('actual')
  const buildHourlyData = useCallback((recs: readonly CategoryTimeSalesRecord[]) => {
    const map = new Map<number, { amount: number; quantity: number }>()
    for (const rec of recs) {
      for (const slot of rec.timeSlots) {
        const ex = map.get(slot.hour) ?? { amount: 0, quantity: 0 }
        ex.amount += slot.amount
        ex.quantity += slot.quantity
        map.set(slot.hour, ex)
      }
    }
    const entries = [...map.entries()].sort(([a], [b]) => a - b)
    if (entries.length === 0) return []
    const minH = Math.min(...entries.map(([h]) => h))
    const maxH = Math.max(...entries.map(([h]) => h))
    const result: { hour: number; amount: number; quantity: number }[] = []
    for (let h = minH; h <= maxH; h++) {
      const d = map.get(h)
      result.push({ hour: h, amount: d?.amount ?? 0, quantity: d?.quantity ?? 0 })
    }
    return result
  }, [])

  const actualHourlyData = useMemo(() => buildHourlyData(dayRecords), [dayRecords, buildHourlyData])
  const prevHourlyData = useMemo(
    () => buildHourlyData(prevDayRecords),
    [prevDayRecords, buildHourlyData],
  )

  const hasPrevData = prevHourlyData.length > 0
  const hourlyData = hourlyMode === 'prev' && hasPrevData ? prevHourlyData : actualHourlyData
  const refData = hourlyMode === 'actual' ? prevHourlyData : actualHourlyData

  const allHours = useMemo(() => {
    const hrs = new Set<number>()
    for (const d of actualHourlyData) hrs.add(d.hour)
    for (const d of prevHourlyData) hrs.add(d.hour)
    return [...hrs].sort((a, b) => a - b)
  }, [actualHourlyData, prevHourlyData])

  const paddedData = useMemo(() => {
    const map = new Map(hourlyData.map((d) => [d.hour, d]))
    return allHours.map((h) => map.get(h) ?? { hour: h, amount: 0, quantity: 0 })
  }, [hourlyData, allHours])

  const paddedRef = useMemo(() => {
    const map = new Map(refData.map((d) => [d.hour, d]))
    return allHours.map((h) => map.get(h) ?? { hour: h, amount: 0, quantity: 0 })
  }, [refData, allHours])

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

  // Aggregate selected hours data
  const selectedData = useMemo(() => {
    if (selectedHours.size === 0) return null
    let amount = 0
    let quantity = 0
    for (const d of paddedData) {
      if (selectedHours.has(d.hour)) {
        amount += d.amount
        quantity += d.quantity
      }
    }
    return { amount, quantity }
  }, [selectedHours, paddedData])

  // Build category detail for selected hours (aggregated across all selected)
  const hourDetail = useMemo((): HourCategoryItem[] => {
    if (selectedHours.size === 0) return []
    const sourceRecs = hourlyMode === 'prev' ? prevDayRecords : dayRecords
    const map = new Map<
      string,
      { dept: string; line: string; klass: string; amount: number; quantity: number }
    >()
    for (const rec of sourceRecs) {
      for (const slot of rec.timeSlots) {
        if (!selectedHours.has(slot.hour)) continue
        if (slot.amount === 0 && slot.quantity === 0) continue
        const key = `${rec.department.code}|${rec.line.code}|${rec.klass.code}`
        const ex = map.get(key) ?? {
          dept: rec.department.name || rec.department.code,
          line: rec.line.name || rec.line.code,
          klass: rec.klass.name || rec.klass.code,
          amount: 0,
          quantity: 0,
        }
        ex.amount += slot.amount
        ex.quantity += slot.quantity
        map.set(key, ex)
      }
    }
    const items = [...map.values()].sort((a, b) => b.amount - a.amount)
    const totalAmt = items.reduce((s, it) => s + it.amount, 0)
    return items.map((it, i) => ({
      ...it,
      pct: totalAmt > 0 ? (it.amount / totalAmt) * 100 : 0,
      color: COLORS[i % COLORS.length],
    }))
  }, [dayRecords, prevDayRecords, selectedHours, hourlyMode])

  const totalAmt = paddedData.reduce((s, d) => s + d.amount, 0)

  const cumData = useMemo(() => {
    const result: { hour: number; cumPct: number }[] = []
    paddedData.reduce((acc, d) => {
      const running = acc + d.amount
      result.push({ hour: d.hour, cumPct: totalAmt > 0 ? (running / totalAmt) * 100 : 0 })
      return running
    }, 0)
    return result
  }, [paddedData, totalAmt])

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

  if (paddedData.length === 0 && prevHourlyData.length === 0) return null
  if (paddedData.length === 0) return null

  const maxAmt = Math.max(...paddedData.map((d) => d.amount), 1)
  const totalQty = paddedData.reduce((s, d) => s + d.quantity, 0)
  const peakHour = paddedData.reduce(
    (peak, d) => (d.amount > peak.amount ? d : peak),
    paddedData[0],
  )

  const hourlyMap = buildHourlyMap(paddedData)
  const coreTime = findCoreTime(hourlyMap)
  const turnaroundHour = findTurnaroundHour(hourlyMap)

  const cumLinePoints = cumData.map((d, i) => `${pxX(i)},${pxY(d.cumPct)}`).join(' ')

  const modeLabel = hourlyMode === 'prev' ? '前年' : '実績'

  const selectedHoursSorted = [...selectedHours].sort((a, b) => a - b)
  const selectedLabel =
    selectedHours.size === 0
      ? ''
      : selectedHours.size <= 3
        ? selectedHoursSorted.map((h) => `${h}時`).join('・')
        : `${selectedHoursSorted[0]}時〜${selectedHoursSorted[selectedHoursSorted.length - 1]}時 (${selectedHours.size}時間)`

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

      <HourlyChartContainer>
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
