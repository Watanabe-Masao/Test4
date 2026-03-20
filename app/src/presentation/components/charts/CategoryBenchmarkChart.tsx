/**
 * カテゴリベンチマーク — 商品力分析ダッシュボード
 *
 * 構成比実数値ベースの総合カテゴリ評価:
 * 1. 総合指数 (Index): 平均構成比を 0-100 に正規化
 * 2. バラツキ: 構成比の変動係数 (CV)
 * 3. カバー率: 実販売店舗数 / 全店舗数
 * 4. 安定度: 1 - CV/2
 * 5. 商品力マップ: Index × バラツキの4タイプ分類
 *
 * 表示ビュー:
 * - チャート: 横棒グラフ（Index順）
 * - テーブル: 全指標一覧
 * - マップ: 商品力4象限マップ
 * - トレンド: 上位カテゴリの推移
 *
 * 箱ひげ図は CategoryBoxPlotChart に分離。
 */
import { memo } from 'react'
import { ChartSkeleton } from '@/presentation/components/common/feedback'
import { EmptyState } from '@/presentation/components/common/layout'
import { palette } from '@/presentation/theme/tokens'
import { ChartCard } from './ChartCard'
import {
  Controls,
  ControlGroup,
  ControlLabel,
  ButtonGroup,
  ToggleBtn,
  ErrorMsg,
  SummaryRow,
  KpiCard,
  KpiLabel,
  KpiValue,
  KpiSub,
  FilterSelect,
} from './CategoryBenchmarkChart.styles'
import {
  type CategoryBenchmarkChartProps,
  type CategoryLevel,
  type ViewMode,
  type AnalysisAxis,
  useCategoryBenchmarkChartVm,
  LEVEL_LABELS,
  VIEW_LABELS,
  ANALYSIS_AXIS_LABELS,
  BENCHMARK_METRIC_LABELS,
} from './CategoryBenchmarkChart.vm'
import type { BenchmarkMetric } from '@/application/hooks/useDuckDBQuery'
import { ChartView, TableView, MapView, TrendView } from './CategoryBenchmarkSubViews'

// ── Component ──

export const CategoryBenchmarkChart = memo(function CategoryBenchmarkChart(
  props: CategoryBenchmarkChartProps,
) {
  const vm = useCategoryBenchmarkChartVm(props)

  if (vm.error) {
    return (
      <ChartCard title="カテゴリベンチマーク">
        <ErrorMsg>
          {vm.errorMessage}: {vm.error}
        </ErrorMsg>
      </ChartCard>
    )
  }

  if (vm.isLoading && !vm.hasRawData) {
    return <ChartSkeleton />
  }

  if (!vm.hasConnection || vm.scores.length === 0) {
    return <EmptyState>データをインポートしてください</EmptyState>
  }

  const toolbar = (
    <Controls>
      <ControlGroup>
        <ControlLabel>階層</ControlLabel>
        <ButtonGroup>
          {(Object.keys(LEVEL_LABELS) as CategoryLevel[]).map((l) => (
            <ToggleBtn key={l} $active={vm.level === l} onClick={() => vm.setLevel(l)}>
              {LEVEL_LABELS[l]}
            </ToggleBtn>
          ))}
        </ButtonGroup>
      </ControlGroup>
      {vm.level !== 'department' && vm.deptList && vm.deptList.length > 0 && (
        <ControlGroup>
          <ControlLabel>部門</ControlLabel>
          <FilterSelect
            value={vm.parentDeptCode}
            onChange={(e) => vm.setParentDeptCode(e.target.value)}
          >
            <option value="">全部門</option>
            {vm.deptList.map((d) => (
              <option key={d.code} value={d.code}>
                {d.name}
              </option>
            ))}
          </FilterSelect>
        </ControlGroup>
      )}
      {vm.level === 'klass' && vm.lineList && vm.lineList.length > 0 && (
        <ControlGroup>
          <ControlLabel>ライン</ControlLabel>
          <FilterSelect
            value={vm.parentLineCode}
            onChange={(e) => vm.setParentLineCode(e.target.value)}
          >
            <option value="">全ライン</option>
            {vm.lineList.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </FilterSelect>
        </ControlGroup>
      )}
      <ControlGroup>
        <ControlLabel>分析軸</ControlLabel>
        <ButtonGroup>
          {(Object.keys(ANALYSIS_AXIS_LABELS) as AnalysisAxis[]).map((a) => (
            <ToggleBtn
              key={a}
              $active={vm.effectiveAxis === a}
              onClick={() => vm.setAnalysisAxis(a)}
              disabled={a === 'store' && vm.isSingleStore}
              title={
                a === 'store' && vm.isSingleStore
                  ? '店舗別比較には複数店舗の選択が必要です'
                  : undefined
              }
            >
              {ANALYSIS_AXIS_LABELS[a]}
            </ToggleBtn>
          ))}
        </ButtonGroup>
      </ControlGroup>
      <ControlGroup $hidden={vm.effectiveAxis !== 'store'}>
        <ControlLabel>指標</ControlLabel>
        <ButtonGroup>
          {(Object.keys(BENCHMARK_METRIC_LABELS) as BenchmarkMetric[]).map((m) => (
            <ToggleBtn
              key={m}
              $active={vm.benchmarkMetric === m}
              onClick={() => vm.setBenchmarkMetric(m)}
            >
              {BENCHMARK_METRIC_LABELS[m]}
            </ToggleBtn>
          ))}
        </ButtonGroup>
      </ControlGroup>
      <ControlGroup>
        <ControlLabel>表示</ControlLabel>
        <ButtonGroup>
          {(Object.keys(VIEW_LABELS) as ViewMode[]).map((v) => (
            <ToggleBtn key={v} $active={vm.view === v} onClick={() => vm.setView(v)}>
              {VIEW_LABELS[v]}
            </ToggleBtn>
          ))}
        </ButtonGroup>
      </ControlGroup>
      <ControlGroup $hidden={vm.effectiveAxis !== 'store'}>
        <ControlLabel>最低店舗数</ControlLabel>
        <ButtonGroup>
          {[1, 2, 3].map((n) => (
            <ToggleBtn key={n} $active={vm.minStores === n} onClick={() => vm.setMinStores(n)}>
              {n === 1 ? '全て' : `${n}店以上`}
            </ToggleBtn>
          ))}
        </ButtonGroup>
      </ControlGroup>
    </Controls>
  )

  return (
    <ChartCard title="カテゴリベンチマーク" subtitle={vm.subtitle} toolbar={toolbar}>
      {vm.kpis && (
        <SummaryRow>
          <KpiCard $accent={palette.positive}>
            <KpiLabel>最高評価</KpiLabel>
            <KpiValue>{vm.kpis.top.name}</KpiValue>
            <KpiSub>Index {vm.kpis.top.index.toFixed(1)}</KpiSub>
          </KpiCard>
          <KpiCard $accent={palette.negative}>
            <KpiLabel>最低評価</KpiLabel>
            <KpiValue>{vm.kpis.bottom.name}</KpiValue>
            <KpiSub>Index {vm.kpis.bottom.index.toFixed(1)}</KpiSub>
          </KpiCard>
          <KpiCard $accent="#6366f1">
            <KpiLabel>平均Index</KpiLabel>
            <KpiValue>{vm.kpis.avgIndex.toFixed(1)}</KpiValue>
            <KpiSub>{vm.scores.length}カテゴリ</KpiSub>
          </KpiCard>
          <KpiCard $accent="#22c55e">
            <KpiLabel>主力カテゴリ</KpiLabel>
            <KpiValue>{vm.kpis.flagshipCount}</KpiValue>
            <KpiSub>不安定: {vm.kpis.unstableCount}</KpiSub>
          </KpiCard>
        </SummaryRow>
      )}

      <div style={{ marginTop: 16 }}>
        {vm.view === 'chart' && <ChartView scores={vm.scores} fmt={vm.fmt} />}
        {vm.view === 'table' && (
          <TableView scores={vm.scores} fmt={vm.fmt} metricLabel={vm.tableMetricLabel} />
        )}
        {vm.view === 'map' && <MapView scores={vm.scores} />}
        {vm.view === 'trend' && (
          <TrendView trendData={vm.trendData} topCodes={vm.topCodes} scores={vm.scores} />
        )}
      </div>
    </ChartCard>
  )
})
