/**
 * カテゴリ箱ひげ図 — 独立ウィジェット
 *
 * カテゴリベンチマークから分離された箱ひげ図ビュー。
 * 店舗別 / 期間別の分布を箱ひげ図で表示し、
 * ドリルダウンで店舗別・日別の内訳を確認できる。
 */
import { memo } from 'react'
import { EmptyState, ChartSkeleton } from '@/presentation/components/common'
import {
  Wrapper,
  HeaderRow,
  Title,
  Subtitle,
  Controls,
  ControlGroup,
  ControlLabel,
  ButtonGroup,
  ToggleBtn,
  ErrorMsg,
  FilterSelect,
} from './CategoryBoxPlotChart.styles'
import {
  useCategoryBoxPlotChartVm,
  LEVEL_LABELS,
  BOX_METRIC_LABELS,
  ANALYSIS_AXIS_LABELS,
  type Props,
  type CategoryLevel,
  type BoxMetric,
  type AnalysisAxis,
} from './CategoryBoxPlotChart.vm'
import { BoxPlotView } from './CategoryBoxPlotView'

// ── Main Component ──

export const CategoryBoxPlotChart = memo(function CategoryBoxPlotChart(props: Props) {
  const vm = useCategoryBoxPlotChartVm(props)

  if (vm.error) {
    return (
      <Wrapper aria-label="カテゴリ箱ひげ図">
        <Title>カテゴリ箱ひげ図</Title>
        <ErrorMsg>
          {vm.messages.errors.dataFetchFailed}: {vm.error}
        </ErrorMsg>
      </Wrapper>
    )
  }

  if (vm.isLoading && !vm.rawRows) {
    return <ChartSkeleton />
  }

  if (!props.duckConn || props.duckDataVersion === 0) {
    return <EmptyState>データをインポートしてください</EmptyState>
  }

  return (
    <Wrapper aria-label="カテゴリ箱ひげ図">
      <HeaderRow>
        <div>
          <Title>カテゴリ箱ひげ図</Title>
          <Subtitle>{vm.subtitle}</Subtitle>
        </div>
        <Controls>
          <ControlGroup>
            <ControlLabel>階層</ControlLabel>
            <ButtonGroup>
              {(Object.keys(LEVEL_LABELS) as CategoryLevel[]).map((l) => (
                <ToggleBtn key={l} $active={vm.level === l} onClick={() => vm.handleLevelChange(l)}>
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
                onChange={(e) => vm.handleDeptChange(e.target.value)}
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
                onChange={(e) => vm.handleLineChange(e.target.value)}
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
              {(Object.keys(BOX_METRIC_LABELS) as BoxMetric[]).map((m) => (
                <ToggleBtn key={m} $active={vm.boxMetric === m} onClick={() => vm.setBoxMetric(m)}>
                  {BOX_METRIC_LABELS[m]}
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
      </HeaderRow>

      <BoxPlotView
        boxData={vm.boxPlotData}
        ct={vm.ct}
        fmt={vm.fmt}
        metricLabel={vm.metricLabel}
        rawRows={vm.rawRows}
        trendRows={vm.trendRows}
        boxMetric={vm.boxMetric}
        boxAxis={vm.effectiveAxis}
        storeNameMap={vm.storeNameMap}
      />
    </Wrapper>
  )
})

export default CategoryBoxPlotChart
