/**
 * TimeSlotChartView — 時間帯別売上チャートの描画コンポーネント
 *
 * 描画専用。データ取得・状態管理は TimeSlotChart（Controller）が担う。
 * DailySalesChart → DailySalesChartBody と同じ Controller / View パターン。
 *
 * Props は完全に ViewModel — weatherCode 等のドメイン値を含まない。
 * @responsibility R:unclassified
 */
import { memo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'styled-components'
import type { AppTheme } from '@/presentation/theme/theme'
import { toPct } from './chartTheme'
import { formatTurnaroundHour } from './timeSlotUtils'
import { EChart, type EChartsOption } from './EChart'
import { sc } from '@/presentation/theme/semanticColors'
import { palette, chartFontSize } from '@/presentation/theme/tokens'
import {
  Controls,
  TabGroup,
  Tab,
  Grid,
  Card,
  CardLabel,
  CardValue,
  CardSub,
  YoYBadge,
  InsightBar,
  InsightItem,
} from './TimeSlotSalesChart.styles'
import { HierarchySelect } from './TimeSlotChart.styles'
import { TimeSlotComparisonTable, TimeSlotWeatherTable } from './TimeSlotComparisonTable'
import type { WeatherHourlyDisplay } from './TimeSlotComparisonTable'
import { CategoryTimeHeatmap } from '@/features/category'
import type { TimeSlotKpi } from '@/application/hooks/useTimeSlotData'
import type { HierarchyOption } from '@/application/hooks/useHierarchySelection'
import type { CategoryHourlyItem } from '@/features/category'

/** chartData の行型（Record<string, string | number | null> と互換） */
interface ChartRow {
  readonly [key: string]: string | number | null
}

// ── Layout constants ──
export const GRID_LEFT = 55
export const GRID_RIGHT = 45

// ── 凡例ヘルパー ──

function LegendItem({
  color,
  dashed,
  children,
}: {
  color: string
  dashed?: boolean
  children: React.ReactNode
}) {
  const swatch = dashed ? (
    <span
      style={{
        display: 'inline-block',
        width: 16,
        height: 0,
        borderTop: `2px dashed ${color}`,
        verticalAlign: 'middle',
        marginRight: 4,
      }}
    />
  ) : (
    <span
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: 2,
        background: color,
        verticalAlign: 'middle',
        marginRight: 4,
      }}
    />
  )
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      {swatch}
      {children}
    </span>
  )
}

// ── LineMode ──

export type LineMode = 'quantity' | 'cumulative' | 'temperature' | 'precipitation'

// ── Props ──

export type ChartMode = 'overview' | 'department'
export type DeptViewMode = 'stacked' | 'separate'

export interface TimeSlotChartViewProps {
  // チャートデータ
  readonly chartOption: EChartsOption
  readonly chartMode: ChartMode
  readonly onChartModeChange: (v: ChartMode) => void
  readonly deptViewMode: DeptViewMode
  readonly onDeptViewModeChange: (v: DeptViewMode) => void
  readonly hours: readonly string[]
  readonly chartData: readonly ChartRow[]
  readonly kpi: TimeSlotKpi | null
  readonly insights: readonly string[]
  readonly curLabel: string
  readonly compLabel: string
  readonly hasPrev: boolean
  readonly showPrev: boolean
  // 天気表示モデル（weatherCode ではなく変換済み）
  readonly curWeather: readonly WeatherHourlyDisplay[]
  readonly prevWeather: readonly WeatherHourlyDisplay[]
  readonly hasWeatherData: boolean
  // カテゴリヒートマップ
  readonly categoryHourlyData: readonly CategoryHourlyItem[]
  readonly prevCategoryHourlyData: readonly CategoryHourlyItem[]
  // 階層選択
  readonly deptOptions: readonly HierarchyOption[]
  readonly lineOptions: readonly HierarchyOption[]
  readonly klassOptions: readonly HierarchyOption[]
  readonly deptCode: string
  readonly lineCode: string
  readonly klassCode: string
  readonly onDeptCodeChange: (v: string) => void
  readonly onLineCodeChange: (v: string) => void
  readonly onKlassCodeChange: (v: string) => void
  // 折れ線モード
  readonly lineMode: LineMode
  readonly onLineModeChange: (v: LineMode) => void
  // 詳細ビュー切替
  readonly detailView: 'table' | 'heatmap'
  readonly onDetailViewChange: (v: 'table' | 'heatmap') => void
  readonly heatmapMetric: 'amount' | 'quantity'
  readonly onHeatmapMetricChange: (v: 'amount' | 'quantity') => void
  // 前年天気マップのサイズ（凡例の表示条件）
  readonly hasPrevWeather: boolean
}

// ── Component ──

export const TimeSlotChartView = memo(function TimeSlotChartView({
  chartOption,
  chartMode,
  onChartModeChange,
  deptViewMode,
  onDeptViewModeChange,
  hours,
  chartData,
  kpi,
  insights,
  curLabel,
  compLabel,
  hasPrev,
  showPrev,
  curWeather,
  prevWeather,
  hasWeatherData,
  categoryHourlyData,
  prevCategoryHourlyData,
  deptOptions,
  lineOptions,
  klassOptions,
  deptCode,
  lineCode,
  klassCode,
  onDeptCodeChange,
  onLineCodeChange,
  onKlassCodeChange,
  lineMode,
  onLineModeChange,
  detailView,
  onDetailViewChange,
  heatmapMetric,
  onHeatmapMetricChange,
  hasPrevWeather,
}: TimeSlotChartViewProps) {
  const theme = useTheme() as AppTheme
  const [showHeatmapYoY, setShowHeatmapYoY] = useState(false)

  return (
    <>
      {/* ── ツールバー ── */}
      <Controls>
        <TabGroup>
          <Tab $active={chartMode === 'overview'} onClick={() => onChartModeChange('overview')}>
            全体比較
          </Tab>
          <Tab $active={chartMode === 'department'} onClick={() => onChartModeChange('department')}>
            部門別
          </Tab>
        </TabGroup>
        {chartMode === 'department' && (
          <TabGroup>
            <Tab
              $active={deptViewMode === 'stacked'}
              onClick={() => onDeptViewModeChange('stacked')}
            >
              積み上げ
            </Tab>
            <Tab
              $active={deptViewMode === 'separate'}
              onClick={() => onDeptViewModeChange('separate')}
            >
              独立
            </Tab>
          </TabGroup>
        )}
        {deptOptions.length > 1 && (
          <HierarchySelect value={deptCode} onChange={(e) => onDeptCodeChange(e.target.value)}>
            <option value="">全部門</option>
            {deptOptions.map((o) => (
              <option key={o.code} value={o.code}>
                {o.name}
              </option>
            ))}
          </HierarchySelect>
        )}
        {deptCode && lineOptions.length > 1 && (
          <HierarchySelect value={lineCode} onChange={(e) => onLineCodeChange(e.target.value)}>
            <option value="">全ライン</option>
            {lineOptions.map((o) => (
              <option key={o.code} value={o.code}>
                {o.name}
              </option>
            ))}
          </HierarchySelect>
        )}
        {lineCode && klassOptions.length > 1 && (
          <HierarchySelect value={klassCode} onChange={(e) => onKlassCodeChange(e.target.value)}>
            <option value="">全クラス</option>
            {klassOptions.map((o) => (
              <option key={o.code} value={o.code}>
                {o.name}
              </option>
            ))}
          </HierarchySelect>
        )}
        <TabGroup style={{ marginLeft: 'auto' }}>
          <Tab $active={lineMode === 'quantity'} onClick={() => onLineModeChange('quantity')}>
            点数
          </Tab>
          <Tab $active={lineMode === 'cumulative'} onClick={() => onLineModeChange('cumulative')}>
            累積構成比
          </Tab>
          {hasWeatherData && (
            <>
              <Tab
                $active={lineMode === 'temperature'}
                onClick={() => onLineModeChange('temperature')}
              >
                気温
              </Tab>
              <Tab
                $active={lineMode === 'precipitation'}
                onClick={() => onLineModeChange('precipitation')}
              >
                降水量
              </Tab>
            </>
          )}
        </TabGroup>
      </Controls>

      {/* ── KPI サマリー ── */}
      {kpi && (
        <Grid>
          <Card $accent={palette.primary}>
            <CardLabel>{curLabel} 総売上</CardLabel>
            <CardValue>{Math.round(kpi.totalAmount / 10000).toLocaleString()}万円</CardValue>
            <CardSub>
              {kpi.totalAmount.toLocaleString()}円
              {kpi.yoyRatio != null && (
                <YoYBadge $positive={kpi.yoyRatio >= 1}>
                  {kpi.yoyRatio >= 1 ? '+' : ''}
                  {toPct(kpi.yoyRatio - 1)}
                </YoYBadge>
              )}
            </CardSub>
          </Card>
          {kpi.prevTotalAmount > 0 && (
            <Card $accent={palette.slate}>
              <CardLabel>{compLabel} 総売上</CardLabel>
              <CardValue>{Math.round(kpi.prevTotalAmount / 10000).toLocaleString()}万円</CardValue>
              <CardSub>{kpi.prevTotalAmount.toLocaleString()}円</CardSub>
            </Card>
          )}
          {kpi.yoyDiff != null && (
            <Card $accent={sc.cond(kpi.yoyDiff >= 0)}>
              <CardLabel>{compLabel}差</CardLabel>
              <CardValue style={{ color: sc.cond(kpi.yoyDiff >= 0) }}>
                {kpi.yoyDiff >= 0 ? '+' : ''}
                {Math.round(kpi.yoyDiff / 10000).toLocaleString()}万円
              </CardValue>
              <CardSub>
                {compLabel}比 {toPct(kpi.yoyRatio ?? 0)}
              </CardSub>
            </Card>
          )}
          <Card $accent={palette.cyanDark}>
            <CardLabel>総数量</CardLabel>
            <CardValue>{kpi.totalQuantity.toLocaleString()}点</CardValue>
            {kpi.yoyQuantityRatio != null && (
              <CardSub>
                <YoYBadge $positive={kpi.yoyQuantityRatio >= 1}>
                  {kpi.yoyQuantityRatio >= 1 ? '+' : ''}
                  {toPct(kpi.yoyQuantityRatio - 1)}
                </YoYBadge>
              </CardSub>
            )}
          </Card>
          {kpi.turnaroundAmt != null && (
            <Card $accent={palette.purpleDark}>
              <CardLabel>折り返し</CardLabel>
              <CardValue>{formatTurnaroundHour(kpi.turnaroundAmt)}</CardValue>
              <CardSub>売上50%到達</CardSub>
            </Card>
          )}
        </Grid>
      )}

      {/* ── チャート ── */}
      <EChart option={chartOption} height={320} ariaLabel="時間帯別売上チャート" />

      {/* ── 天気アイコン ── */}
      <TimeSlotWeatherTable
        hours={hours}
        compLabel={compLabel}
        hasPrev={hasPrev}
        curWeather={curWeather}
        prevWeather={prevWeather}
        gridLeft={GRID_LEFT}
        gridRight={GRID_RIGHT}
      />

      {/* ── 凡例 ── */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 16,
          fontSize: chartFontSize.axis,
          color: theme.colors.text3,
          marginTop: 4,
          marginBottom: 4,
        }}
      >
        <LegendItem color={palette.primary}>{showPrev ? `${curLabel}売上` : '売上金額'}</LegendItem>
        {showPrev && <LegendItem color={`${palette.slate}80`}>{compLabel}売上</LegendItem>}
        {lineMode === 'quantity' && (
          <>
            <LegendItem color={palette.cyan}>{showPrev ? `${curLabel}点数` : '点数'}</LegendItem>
            {showPrev && (
              <LegendItem color={palette.cyan} dashed>
                {compLabel}点数
              </LegendItem>
            )}
          </>
        )}
        {lineMode === 'temperature' && (
          <>
            <LegendItem color={palette.warningDark}>
              {showPrev ? `${curLabel}気温` : '気温'}
            </LegendItem>
            {showPrev && hasPrevWeather && (
              <LegendItem color={palette.warningDark} dashed>
                {compLabel}気温
              </LegendItem>
            )}
          </>
        )}
        {lineMode === 'precipitation' && (
          <>
            <LegendItem color={palette.infoDark}>
              {showPrev ? `${curLabel}降水量` : '降水量'}
            </LegendItem>
            {showPrev && hasPrevWeather && (
              <LegendItem color={palette.infoDark} dashed>
                {compLabel}降水量
              </LegendItem>
            )}
          </>
        )}
      </div>

      {/* ── 詳細ビュー切替 ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
        <TabGroup>
          <Tab $active={detailView === 'table'} onClick={() => onDetailViewChange('table')}>
            比較テーブル
          </Tab>
          {categoryHourlyData.length > 0 && (
            <Tab $active={detailView === 'heatmap'} onClick={() => onDetailViewChange('heatmap')}>
              ヒートマップ
            </Tab>
          )}
        </TabGroup>
        {/* ドリル中の戻るボタン */}
        {(deptCode || lineCode) && (
          <button
            style={{
              padding: '2px 8px',
              fontSize: '0.65rem',
              border: `1px solid ${palette.primary}`,
              borderRadius: '4px',
              background: 'transparent',
              color: palette.primary,
              cursor: 'pointer',
            }}
            onClick={() => {
              if (lineCode) {
                onLineCodeChange('')
              } else if (deptCode) {
                onDeptCodeChange('')
              }
            }}
          >
            ← 戻る
          </button>
        )}
        <TabGroup style={{ marginLeft: 'auto' }}>
          <Tab $active={heatmapMetric === 'amount'} onClick={() => onHeatmapMetricChange('amount')}>
            金額
          </Tab>
          <Tab
            $active={heatmapMetric === 'quantity'}
            onClick={() => onHeatmapMetricChange('quantity')}
          >
            点数
          </Tab>
        </TabGroup>
        {hasPrev && prevCategoryHourlyData.length > 0 && (
          <TabGroup style={{ marginLeft: 12 }}>
            <Tab $active={!showHeatmapYoY} onClick={() => setShowHeatmapYoY(false)}>
              実績値
            </Tab>
            <Tab $active={showHeatmapYoY} onClick={() => setShowHeatmapYoY(true)}>
              前年比
            </Tab>
          </TabGroup>
        )}
      </div>

      <AnimatePresence mode="wait">
        {detailView === 'table' ? (
          <motion.div
            key="detail-table"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            <TimeSlotComparisonTable
              chartData={chartData}
              curLabel={curLabel}
              compLabel={compLabel}
              hasPrev={hasPrev}
              metric={heatmapMetric}
              gridLeft={GRID_LEFT}
              gridRight={GRID_RIGHT}
            />
          </motion.div>
        ) : (
          <motion.div
            key={`detail-heatmap-${deptCode}-${lineCode}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            <CategoryTimeHeatmap
              data={categoryHourlyData}
              prevData={prevCategoryHourlyData}
              metric={heatmapMetric}
              showYoY={showHeatmapYoY}
              gridLeft={80}
              gridRight={GRID_RIGHT}
              onCategoryClick={(code) => {
                if (!deptCode || deptCode === '') {
                  onDeptCodeChange(code)
                } else if (!lineCode || lineCode === '') {
                  onLineCodeChange(code)
                } else {
                  onKlassCodeChange(code)
                }
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {insights.length > 0 && (
        <InsightBar>
          {insights.map((line, i) => (
            <InsightItem key={i}>{line}</InsightItem>
          ))}
        </InsightBar>
      )}
    </>
  )
})
