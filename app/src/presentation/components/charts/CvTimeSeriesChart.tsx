/**
 * CV時系列分析チャート
 *
 * 需要の安定性を3つのビューで可視化:
 * 1. CV折れ線グラフ — カテゴリ別CVの日別推移（PI重ね表示可）
 * 2. 売上×CV二軸グラフ — 売上高とCVを同一チャートで比較
 * 3. SKU×時間CVヒートマップ — カテゴリ×日付のCV値をセル色で表示
 *
 * PI↑CV↓=定番化 / PI↑CV↑=プロモ / PI↓CV↑=需要崩れ を判定。
 *
 * @guard H1 Screen Plan 経由のみ
 * @guard H4 component に acquisition logic 禁止
 */
import { useState, useMemo, memo } from 'react'
import type { DateRange } from '@/domain/models/calendar'
import type { QueryExecutor } from '@/application/queries/QueryPort'
import { useCategoryBenchmarkPlan } from '@/application/hooks/useCategoryBenchmarkPlan'
import {
  buildCategoryBenchmarkScores,
  buildCategoryTrendData,
} from '@/application/queries/advanced'
import { useChartTheme, useCurrencyFormat } from './chartTheme'
import { ChartSkeleton } from '@/presentation/components/common/feedback'
import { ChartCard } from './ChartCard'
import {
  ControlStrip,
  ControlItem,
  ControlItemLabel,
  ControlBtnGroup,
  ToggleBtn,
  ChartErrorMsg,
  CATEGORY_COLORS,
  HIERARCHY_LABELS,
  type HierarchyLevel,
} from './ChartParts'
import { StatusTable, StatusBadge } from './CvTimeSeriesChart.styles'
import {
  type ViewMode,
  type OverlayMode,
  VIEW_LABELS,
  OVERLAY_LABELS,
  STATUS_MAP,
  buildAllChartData,
  buildSalesByDateCode,
  getOverlayFlags,
  getSubtitleText,
} from './CvTimeSeriesChart.vm'
import { CvLineView } from './CvLineView'
import { CvSalesCvView } from './CvSalesCvView'
import { CvHeatmapView } from './CvHeatmapView'

// ── メインコンポーネント ──

interface Props {
  readonly queryExecutor: QueryExecutor | null
  readonly currentDateRange: DateRange
  readonly selectedStoreIds: ReadonlySet<string>
}

export const CvTimeSeriesChart = memo(function CvTimeSeriesChart({
  queryExecutor,
  currentDateRange,
  selectedStoreIds,
}: Props) {
  const ct = useChartTheme()
  const { format: fmtCurrency } = useCurrencyFormat()
  const [level, setLevel] = useState<HierarchyLevel>('department')
  const [viewMode, setViewMode] = useState<ViewMode>('cvLine')
  const [overlay, setOverlay] = useState<OverlayMode>('both')
  const [topN, setTopN] = useState(5)

  // Screen Plan: categoryBenchmark + categoryBenchmarkTrend + hierarchy を一元管理
  const plan = useCategoryBenchmarkPlan({
    executor: queryExecutor,
    currentDateRange,
    selectedStoreIds,
    level,
    parentDeptCode: '',
    parentLineCode: '',
  })

  const storeCount = selectedStoreIds.size || 0

  const benchmarkRows = plan.benchmarkData.data?.records ?? null
  const trendRows = plan.trendData.data?.records ?? null

  const topCodes = useMemo(() => {
    if (!benchmarkRows || benchmarkRows.length === 0) return []
    const scores = buildCategoryBenchmarkScores(benchmarkRows, 1, storeCount, 'salesPi')
    return scores.slice(0, topN).map((s) => s.code)
  }, [benchmarkRows, storeCount, topN])

  const trendPoints = useMemo(() => {
    if (!trendRows || trendRows.length === 0 || topCodes.length === 0) return []
    return buildCategoryTrendData(trendRows, topCodes, storeCount)
  }, [trendRows, topCodes, storeCount])

  const salesByDateCode = useMemo(() => {
    if (!trendRows) return new Map<string, number>()
    return buildSalesByDateCode(trendRows, topCodes)
  }, [trendRows, topCodes])

  const chartData = useMemo(
    () => buildAllChartData(trendPoints, topCodes, salesByDateCode),
    [trendPoints, topCodes, salesByDateCode],
  )

  const isLoading = plan.isLoading

  if (isLoading) {
    return (
      <ChartCard title="CV時系列分析">
        <ChartSkeleton height="280px" />
      </ChartCard>
    )
  }

  if (plan.error) {
    return (
      <ChartCard title="CV時系列分析">
        <ChartErrorMsg>データの取得に失敗しました</ChartErrorMsg>
      </ChartCard>
    )
  }

  if (chartData.cvLineData.length === 0) {
    return (
      <ChartCard title="CV時系列分析">
        <ChartErrorMsg>データがありません</ChartErrorMsg>
      </ChartCard>
    )
  }

  const { showCv, showPi } = getOverlayFlags(overlay)

  return (
    <ChartCard
      title="CV時系列分析"
      subtitle={`${getSubtitleText(viewMode, showPi)} / ${HIERARCHY_LABELS[level]}別 / 上位${topN}`}
      toolbar={
        <ControlStrip>
          <ControlItem>
            <ControlItemLabel>ビュー</ControlItemLabel>
            <ControlBtnGroup>
              {(Object.keys(VIEW_LABELS) as ViewMode[]).map((m) => (
                <ToggleBtn key={m} $active={viewMode === m} onClick={() => setViewMode(m)}>
                  {VIEW_LABELS[m]}
                </ToggleBtn>
              ))}
            </ControlBtnGroup>
          </ControlItem>
          {viewMode === 'cvLine' && (
            <ControlItem>
              <ControlItemLabel>表示</ControlItemLabel>
              <ControlBtnGroup>
                {(Object.keys(OVERLAY_LABELS) as OverlayMode[]).map((m) => (
                  <ToggleBtn key={m} $active={overlay === m} onClick={() => setOverlay(m)}>
                    {OVERLAY_LABELS[m]}
                  </ToggleBtn>
                ))}
              </ControlBtnGroup>
            </ControlItem>
          )}
          <ControlItem>
            <ControlItemLabel>上位N</ControlItemLabel>
            <ControlBtnGroup>
              {[3, 5, 10].map((n) => (
                <ToggleBtn key={n} $active={topN === n} onClick={() => setTopN(n)}>
                  {n}
                </ToggleBtn>
              ))}
            </ControlBtnGroup>
          </ControlItem>
          <ControlItem>
            <ControlItemLabel>階層</ControlItemLabel>
            <ControlBtnGroup>
              {(Object.keys(HIERARCHY_LABELS) as HierarchyLevel[]).map((l) => (
                <ToggleBtn key={l} $active={level === l} onClick={() => setLevel(l)}>
                  {HIERARCHY_LABELS[l]}
                </ToggleBtn>
              ))}
            </ControlBtnGroup>
          </ControlItem>
        </ControlStrip>
      }
    >
      {viewMode === 'cvLine' && (
        <CvLineView
          data={chartData.cvLineData}
          topCodes={topCodes}
          categoryNames={chartData.categoryNames}
          showCv={showCv}
          showPi={showPi}
        />
      )}

      {viewMode === 'salesCv' && (
        <CvSalesCvView
          data={chartData.salesCvData}
          topCodes={topCodes}
          categoryNames={chartData.categoryNames}
          fmtCurrency={fmtCurrency}
        />
      )}

      {viewMode === 'heatmap' && (
        <CvHeatmapView
          topCodes={topCodes}
          categoryNames={chartData.categoryNames}
          dateKeys={chartData.heatmap.dateKeys}
          cvMap={chartData.heatmap.cvMap}
          maxCv={chartData.heatmap.maxCv}
          ct={ct}
        />
      )}

      {/* 状態判定テーブル */}
      <StatusTable>
        {topCodes.map((code, i) => {
          const status = chartData.categoryStatuses.get(code) ?? 'unknown'
          const info = STATUS_MAP[status]
          return (
            <div key={code} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: '0.6rem', color: ct.text }}>
                {chartData.categoryNames.get(code) ?? code}
              </span>
              <StatusBadge $color={info.color}>
                {info.label} ({info.description})
              </StatusBadge>
            </div>
          )
        })}
      </StatusTable>
    </ChartCard>
  )
})
