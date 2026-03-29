/**
 * 部門別時間帯パターンチャート (ECharts) — 統合ビュー
 *
 * 第1軸: 部門別積み上げ面グラフ（売上金額）
 * 第2軸: 点数 / 累積構成比 / 気温 / 降水量 の切替オーバーレイ
 *
 * パイプライン:
 *   CategoryHourlyHandler → DeptHourlyChartLogic.ts → ECharts option → EChart
 *   HourlyAggregation / WeatherHourlyAvg → 第2軸オーバーレイ
 */
import React, { useState, useMemo, useCallback } from 'react'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { HOUR_MIN, HOUR_MAX } from './HeatmapChart.helpers'
import type { DateRange, PrevYearScope } from '@/domain/models/calendar'
import { dateRangeToKeys } from '@/domain/models/calendar'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useQueryWithHandler } from '@/application/hooks/useQueryWithHandler'
import {
  categoryHourlyHandler,
  type CategoryHourlyInput,
} from '@/application/queries/cts/CategoryHourlyHandler'
import {
  hourlyAggregationHandler,
  type HourlyAggregationInput,
} from '@/application/queries/cts/HourlyAggregationHandler'
import { useCurrencyFormatter } from './chartTheme'
import {
  buildDeptHourlyData,
  detectCannibalization,
  buildDeptHourlyOption,
  TOP_N_OPTIONS,
} from './DeptHourlyChartLogic'
import { useI18n } from '@/application/hooks/useI18n'
import { SegmentedControl } from '@/presentation/components/common/layout'
import { ChartCard } from './ChartCard'
import { ChartLoading, ChartError, ChartEmpty } from './ChartState'
import { EChart } from './EChart'
import {
  TopNSelector,
  TopNSelect,
  ChipContainer,
  DeptChip,
  ColorDot,
  SummaryRow,
  SummaryItem,
  SummaryLabel,
  InsightBar,
  InsightItem,
  InsightTitle,
  BreadcrumbRow,
  BreadcrumbLink,
  BreadcrumbSep,
  BreadcrumbCurrent,
  BackRow,
  BackLink,
  DrillIcon,
} from './DeptHourlyChart.styles'

type ViewMode = 'stacked' | 'separate'
type HierarchyLevel = 'department' | 'line' | 'klass'
export type RightOverlayMode = 'quantity' | 'cumRatio' | 'temperature' | 'precipitation'

const VIEW_OPTIONS: readonly { value: ViewMode; label: string }[] = [
  { value: 'stacked', label: '積み上げ' },
  { value: 'separate', label: '独立' },
]

const LEVEL_OPTIONS: readonly { value: HierarchyLevel; label: string }[] = [
  { value: 'department', label: '部門' },
  { value: 'line', label: 'ライン' },
  { value: 'klass', label: 'クラス' },
]

const RIGHT_OVERLAY_OPTIONS: readonly { value: RightOverlayMode; label: string }[] = [
  { value: 'quantity', label: '点数' },
  { value: 'cumRatio', label: '累積構成比' },
  { value: 'temperature', label: '気温' },
  { value: 'precipitation', label: '降水量' },
]

const LEVEL_LABELS: Record<HierarchyLevel, string> = {
  department: '部門',
  line: 'ライン',
  klass: 'クラス',
}

interface DrillState {
  readonly level: HierarchyLevel
  readonly deptCode?: string
  readonly deptName?: string
  readonly lineCode?: string
  readonly lineName?: string
}

/** 第2軸オーバーレイ用データ（時間帯ごとの値） */
export interface HourlyOverlayData {
  readonly hour: number
  readonly quantity?: number
  readonly temperature?: number
  readonly precipitation?: number
}

interface Props {
  readonly queryExecutor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
  /** 前年スコープ（点数の前年データ取得用） */
  readonly prevYearScope?: PrevYearScope
  /** 時間帯別の天気データ（親から受け渡し） */
  readonly weatherOverlay?: readonly HourlyOverlayData[]
}

export const DeptHourlyChart = React.memo(function DeptHourlyChart({
  queryExecutor,
  currentDateRange,
  selectedStoreIds,
  prevYearScope,
  weatherOverlay,
}: Props) {
  const theme = useTheme() as AppTheme
  const fmt = useCurrencyFormatter()
  const { messages } = useI18n()
  const [topN, setTopN] = useState(5)
  const [activeDepts, setActiveDepts] = useState<ReadonlySet<string>>(new Set())
  const [viewMode, setViewMode] = useState<ViewMode>('stacked')
  const [drill, setDrill] = useState<DrillState>({ level: 'department' })
  const [rightMode, setRightMode] = useState<RightOverlayMode>('quantity')

  // ── 部門別時間帯データ（第1軸） ──
  const input = useMemo<CategoryHourlyInput | null>(() => {
    const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
    return {
      dateFrom: fromKey,
      dateTo: toKey,
      storeIds: selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined,
      level: drill.level,
      deptCode: drill.deptCode,
      lineCode: drill.lineCode,
    }
  }, [currentDateRange, selectedStoreIds, drill.level, drill.deptCode, drill.lineCode])

  const {
    data: output,
    error,
    isLoading,
  } = useQueryWithHandler(queryExecutor, categoryHourlyHandler, input)

  const categoryHourlyRows = output?.records ?? null

  // ── 時間帯別点数データ（第2軸: quantity モード用） ──
  const storeIds = useMemo(
    () => (selectedStoreIds.size > 0 ? [...selectedStoreIds] : undefined),
    [selectedStoreIds],
  )
  const qtyInput = useMemo<HourlyAggregationInput | null>(() => {
    if (rightMode !== 'quantity') return null
    const { fromKey, toKey } = dateRangeToKeys(currentDateRange)
    return { dateFrom: fromKey, dateTo: toKey, storeIds, isPrevYear: false }
  }, [currentDateRange, storeIds, rightMode])

  const prevDateRange = prevYearScope?.dateRange
  const prevQtyInput = useMemo<HourlyAggregationInput | null>(() => {
    if (rightMode !== 'quantity' || !prevDateRange) return null
    const { fromKey, toKey } = dateRangeToKeys(prevDateRange)
    return { dateFrom: fromKey, dateTo: toKey, storeIds, isPrevYear: true }
  }, [prevDateRange, storeIds, rightMode])

  const { data: curQtyOut } = useQueryWithHandler(queryExecutor, hourlyAggregationHandler, qtyInput)
  const { data: prevQtyOut } = useQueryWithHandler(
    queryExecutor,
    hourlyAggregationHandler,
    prevQtyInput,
  )

  // 天気・点数 → hourMap
  const overlayByHour = useMemo(() => {
    const m = new Map<number, HourlyOverlayData>()
    if (curQtyOut?.records) {
      for (const r of curQtyOut.records) {
        m.set(r.hour, { hour: r.hour, quantity: r.totalQuantity })
      }
    }
    if (weatherOverlay) {
      for (const w of weatherOverlay) {
        const existing = m.get(w.hour) ?? { hour: w.hour }
        m.set(w.hour, { ...existing, temperature: w.temperature, precipitation: w.precipitation })
      }
    }
    return m
  }, [curQtyOut, weatherOverlay])

  const prevQtyByHour = useMemo(() => {
    if (!prevQtyOut?.records) return undefined
    const m = new Map<number, number>()
    for (const r of prevQtyOut.records) m.set(r.hour, r.totalQuantity)
    return m
  }, [prevQtyOut])

  const { chartData, departments, hourlyPatterns } = useMemo(
    () =>
      categoryHourlyRows
        ? buildDeptHourlyData(categoryHourlyRows, topN, activeDepts, HOUR_MIN, HOUR_MAX)
        : { chartData: [], departments: [], hourlyPatterns: new Map<string, number[]>() },
    [categoryHourlyRows, topN, activeDepts],
  )

  const cannibalization = useMemo(
    () => detectCannibalization(departments, hourlyPatterns),
    [departments, hourlyPatterns],
  )

  const option = useMemo(
    () =>
      buildDeptHourlyOption(
        chartData,
        departments,
        viewMode,
        theme,
        rightMode,
        overlayByHour,
        prevQtyByHour,
      ),
    [chartData, departments, viewMode, theme, rightMode, overlayByHour, prevQtyByHour],
  )

  const handleTopNChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setTopN(Number(e.target.value))
    setActiveDepts(new Set())
  }, [])

  const handleChipClick = useCallback((code: string) => {
    setActiveDepts((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }, [])

  const handleDrillDown = useCallback(
    (code: string, name: string) => {
      setActiveDepts(new Set())
      if (drill.level === 'department') {
        setDrill({ level: 'line', deptCode: code, deptName: name })
      } else if (drill.level === 'line') {
        setDrill({
          level: 'klass',
          deptCode: drill.deptCode,
          deptName: drill.deptName,
          lineCode: code,
          lineName: name,
        })
      }
    },
    [drill],
  )

  const handleDrillUp = useCallback(() => {
    setActiveDepts(new Set())
    if (drill.level === 'klass') {
      setDrill({ level: 'line', deptCode: drill.deptCode, deptName: drill.deptName })
    } else if (drill.level === 'line') {
      setDrill({ level: 'department' })
    }
  }, [drill])

  const handleLevelChange = useCallback((level: HierarchyLevel) => {
    setActiveDepts(new Set())
    setDrill({ level })
  }, [])

  const chartTitle = '部門別時間帯パターン'

  if (error) {
    return (
      <ChartCard title={chartTitle}>
        <ChartError message={`${messages.errors.dataFetchFailed}: ${error}`} />
      </ChartCard>
    )
  }
  if (isLoading && !categoryHourlyRows) {
    return (
      <ChartCard title={chartTitle}>
        <ChartLoading />
      </ChartCard>
    )
  }
  if (!queryExecutor || chartData.length === 0) {
    return (
      <ChartCard title={chartTitle}>
        <ChartEmpty message="データをインポートしてください" />
      </ChartCard>
    )
  }

  const levelLabel = LEVEL_LABELS[drill.level]
  const subtitle = `上位${topN}${levelLabel}の時間帯別売上 | ${viewMode === 'stacked' ? '積み上げ面グラフ' : '独立面グラフ'}`

  // パンくずリスト（ドリルダウン時）
  const breadcrumb =
    drill.level !== 'department' ? (
      <BreadcrumbRow>
        <BreadcrumbLink onClick={() => setDrill({ level: 'department' })}>全部門</BreadcrumbLink>
        {drill.deptName && (
          <>
            <BreadcrumbSep>›</BreadcrumbSep>
            {drill.level === 'line' ? (
              <BreadcrumbCurrent>{drill.deptName}</BreadcrumbCurrent>
            ) : (
              <BreadcrumbLink
                onClick={() =>
                  setDrill({ level: 'line', deptCode: drill.deptCode, deptName: drill.deptName })
                }
              >
                {drill.deptName}
              </BreadcrumbLink>
            )}
          </>
        )}
        {drill.lineName && (
          <>
            <BreadcrumbSep>›</BreadcrumbSep>
            <BreadcrumbCurrent>{drill.lineName}</BreadcrumbCurrent>
          </>
        )}
      </BreadcrumbRow>
    ) : null

  const toolbar = (
    <>
      <SegmentedControl
        options={LEVEL_OPTIONS}
        value={drill.level}
        onChange={handleLevelChange}
        ariaLabel="階層レベル"
      />
      <SegmentedControl
        options={VIEW_OPTIONS}
        value={viewMode}
        onChange={setViewMode}
        ariaLabel="表示モード"
      />
      <TopNSelector>
        <span>上位</span>
        <TopNSelect value={topN} onChange={handleTopNChange}>
          {TOP_N_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n}
              {levelLabel}
            </option>
          ))}
        </TopNSelect>
      </TopNSelector>
      <SegmentedControl
        options={RIGHT_OVERLAY_OPTIONS}
        value={rightMode}
        onChange={setRightMode}
        ariaLabel="第2軸"
      />
    </>
  )

  const canDrillDown = drill.level !== 'klass'

  return (
    <ChartCard title={chartTitle} subtitle={subtitle} toolbar={toolbar}>
      {breadcrumb}

      <ChipContainer>
        {departments.map((dept) => (
          <DeptChip
            key={dept.code}
            $color={dept.color}
            $active={activeDepts.size === 0 || activeDepts.has(dept.code)}
            onClick={() => handleChipClick(dept.code)}
            onDoubleClick={canDrillDown ? () => handleDrillDown(dept.code, dept.name) : undefined}
            title={canDrillDown ? 'ダブルクリックでドリルダウン' : undefined}
          >
            <ColorDot $color={dept.color} />
            {dept.name}
            {canDrillDown && <DrillIcon>▸</DrillIcon>}
          </DeptChip>
        ))}
      </ChipContainer>

      {drill.level !== 'department' && (
        <BackRow>
          <BackLink onClick={handleDrillUp}>
            ← {drill.level === 'klass' ? 'ライン' : '部門'}に戻る
          </BackLink>
        </BackRow>
      )}

      <EChart option={option} height={300} ariaLabel="部門別時間帯パターンチャート" />

      <SummaryRow>
        {departments.slice(0, 5).map((dept) => (
          <SummaryItem key={dept.code}>
            <SummaryLabel>{dept.name}:</SummaryLabel>
            {fmt(dept.totalAmount)}
          </SummaryItem>
        ))}
      </SummaryRow>

      {cannibalization.length > 0 && (
        <InsightBar>
          <InsightTitle>時間帯カニバリゼーション検出（相関分析）</InsightTitle>
          {cannibalization.map((c, i) => (
            <InsightItem key={i}>
              {c.deptA} × {c.deptB}: 相関r={c.r.toFixed(2)}（負の相関 → 同時間帯で競合の可能性）
            </InsightItem>
          ))}
        </InsightBar>
      )}
    </ChartCard>
  )
})
