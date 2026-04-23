/**
 * BudgetSimulatorView — 予算達成シミュレーター 表示専用 component
 *
 * reboot plan Phase C の成果物。`BudgetSimulatorWidget` から context 依存と
 * scenario/state 組み立てを取り除き、この View は props として:
 *
 *   - `scenario: SimulatorScenario` (read-only な期間・予算・前年・実績データ)
 *   - `state: SimulatorStateApi` (UI 操作 state + setter)
 *   - `vm: SimulatorWidgetVm` (pure 変換済みの行データ / 予測)
 *   - `fmtCurrency` (通貨フォーマッタ)
 *
 * だけを受け取る。`UnifiedWidgetContext` / DuckDB / raw hook を一切知らない。
 *
 * これにより Storybook / 単体テストで mock scenario を注入して描画確認できる。
 *
 * @responsibility R:widget
 */
import { memo } from 'react'
import { formatPercent } from '@/domain/formatting'
import { Table, TableWrapper, Td, Th, Tr } from '@/presentation/pages/Insight/InsightPage.styles'
import { Card } from '@/presentation/components/common/layout'
import { dowOf } from '@/domain/calculations/budgetSimulator'
import type { SimulatorScenario } from '@/domain/calculations/budgetSimulator'
import type { CurrencyFormatter } from '@/presentation/components/charts/chartTheme'
import type { SimulatorStateApi } from '../application/useSimulatorState'
import type { WeatherIconMaps } from '../application/buildWeatherIconMaps'
import {
  type DrillKey,
  type SimulatorWidgetRow,
  type SimulatorWidgetVm,
} from './BudgetSimulatorWidget.vm'
import {
  ClickableTr,
  DiffNegative,
  DiffNeutral,
  DiffPositive,
  DrillCaret,
  DrillRow,
  GroupRow,
  HeaderDate,
  HeaderLeft,
  HeaderTitle,
  HighlightRow,
  ModeToggleBtn,
  ModeToggleRow,
  SimChartLbl,
  SimChartWrap,
  SimFormula,
  SimInputLabel,
  SimInputSection,
  SimResultCard,
  SimResultGrid,
  SimResultLabel,
  SimResultSub,
  SimResultValue,
  SimulatorHeader,
  SmallText,
} from './BudgetSimulatorWidget.styles'
import { TimelineSlider } from './TimelineSlider'
import { RemainingInputPanel } from './RemainingInputPanel'
import { DayCalendarInput } from './DayCalendarInput'
import { DrilldownPanel } from './DrilldownPanel'
import { ProjectionBarChart } from './ProjectionBarChart'
import { StripChart } from './StripChart'

const DOW_JP = ['日', '月', '火', '水', '木', '金', '土'] as const

export interface BudgetSimulatorViewProps {
  readonly scenario: SimulatorScenario
  readonly state: SimulatorStateApi
  readonly vm: SimulatorWidgetVm
  readonly fmtCurrency: CurrencyFormatter
  readonly drill: DrillKey | null
  readonly onToggleDrill: (key: DrillKey) => void
  /**
   * ①②③④ カレンダーセルをクリックしたときに呼ばれる。
   * 未指定の場合はクリック不可 (= セルはリンク化されない)。
   */
  readonly onDayClick?: (day: number) => void
  /** 日別天気絵文字 (当年 / 前年 の day→icon)。省略で天気表示なし */
  readonly weatherIcons?: WeatherIconMaps
}

export function BudgetSimulatorView({
  scenario,
  state,
  vm,
  fmtCurrency,
  drill,
  onToggleDrill,
  onDayClick,
  weatherIcons,
}: BudgetSimulatorViewProps) {
  const { year, month } = scenario
  const dow = dowOf(year, month, vm.kpis.currentDay)

  return (
    <Card>
      {/* ── c-head: Title + Date (left) / Slider (right) ── */}
      <SimulatorHeader>
        <HeaderLeft>
          <HeaderTitle>予算達成シミュレーター</HeaderTitle>
          <HeaderDate>
            {year}年 {month}月 <strong>{vm.kpis.currentDay}</strong>日（{DOW_JP[dow]}） ／ 残{' '}
            {vm.kpis.remainingDays}日
          </HeaderDate>
        </HeaderLeft>
        <TimelineSlider
          currentDay={vm.kpis.currentDay}
          daysInMonth={scenario.daysInMonth}
          onChange={state.setCurrentDay}
        />
      </SimulatorHeader>

      {/* ── KPI テーブル (4 セクション) ── */}
      <TableWrapper>
        <Table>
          <thead>
            <tr>
              <Th>項目</Th>
              <Th>金額</Th>
              <Th>前年実績</Th>
              <Th>前年比</Th>
              <Th>達成率</Th>
              <Th>日次推移</Th>
            </tr>
          </thead>
          <tbody>
            {vm.rows.map((row, i) => (
              <RowRender
                key={i}
                row={row}
                fmtCurrency={fmtCurrency}
                currentDay={vm.kpis.currentDay}
                drill={drill}
                onToggleDrill={onToggleDrill}
                scenario={scenario}
                weekStart={state.weekStart}
                onDayClick={onDayClick}
                weatherIcons={weatherIcons}
              />
            ))}
          </tbody>
        </Table>
      </TableWrapper>

      {/* ── ④ 着地シミュレーター入力部 ── */}
      <SimInputSection>
        <ModeToggleRow>
          <SimInputLabel>④ 残期間の前提を入力</SimInputLabel>
          <ModeToggleBtn
            type="button"
            $active={state.mode === 'yoy'}
            onClick={() => state.setMode('yoy')}
          >
            前年比
          </ModeToggleBtn>
          <ModeToggleBtn
            type="button"
            $active={state.mode === 'ach'}
            onClick={() => state.setMode('ach')}
          >
            予算達成率
          </ModeToggleBtn>
          <ModeToggleBtn
            type="button"
            $active={state.mode === 'dow'}
            onClick={() => state.setMode('dow')}
          >
            曜日別
          </ModeToggleBtn>
        </ModeToggleRow>
        <RemainingInputPanel
          scenario={scenario}
          currentDay={vm.kpis.currentDay}
          mode={state.mode}
          yoyInput={state.yoyInput}
          achInput={state.achInput}
          dowInputs={state.dowInputs}
          dowBase={state.dowBase}
          dayOverrides={state.dayOverrides}
          fmtCurrency={fmtCurrency}
          onYoyChange={state.setYoyInput}
          onAchChange={state.setAchInput}
          onDowChange={state.setDowInputs}
          onDowBaseChange={state.setDowBase}
        />

        {state.mode === 'dow' && (
          <DayCalendarInput
            scenario={scenario}
            currentDay={vm.kpis.currentDay}
            dowInputs={state.dowInputs}
            dowBase={state.dowBase}
            dayOverrides={state.dayOverrides}
            weekStart={state.weekStart}
            fmtCurrency={fmtCurrency}
            onWeekStartChange={state.setWeekStart}
            onOverrideChange={state.setDayOverride}
            onOverrideClear={state.clearDayOverride}
            onResetAll={state.resetDayOverrides}
            onDayClick={onDayClick}
            weatherIcons={weatherIcons}
          />
        )}

        <SimFormula>{renderFormula(state.mode, state.dowBase, vm, fmtCurrency)}</SimFormula>

        <SimResultGrid>
          <SimResultCard>
            <SimResultLabel>残期間売上予測</SimResultLabel>
            <SimResultValue>¥{fmtCurrency(vm.remainingSales)}</SimResultValue>
            <SimResultSub>残{vm.kpis.remainingDays}日</SimResultSub>
          </SimResultCard>
          <SimResultCard $highlight>
            <SimResultLabel>月末着地見込</SimResultLabel>
            <SimResultValue>¥{fmtCurrency(vm.finalLanding)}</SimResultValue>
            <SimResultSub>経過実績 + 残期間予測</SimResultSub>
          </SimResultCard>
          <SimResultCard>
            <SimResultLabel>月間予算との差異</SimResultLabel>
            <SimResultValue $positive={vm.landingDiff >= 0} $negative={vm.landingDiff < 0}>
              {vm.landingDiff >= 0 ? '+' : ''}¥{fmtCurrency(vm.landingDiff)}
            </SimResultValue>
            <SimResultSub>
              予算比 {vm.finalVsBudget != null ? `${vm.finalVsBudget.toFixed(1)}%` : '—'}
            </SimResultSub>
          </SimResultCard>
          <SimResultCard>
            <SimResultLabel>月末着地 前年比</SimResultLabel>
            <SimResultValue
              $positive={vm.finalVsLY != null && vm.finalVsLY >= 100}
              $negative={vm.finalVsLY != null && vm.finalVsLY < 100}
            >
              {vm.finalVsLY != null ? `${vm.finalVsLY.toFixed(1)}%` : '—'}
            </SimResultValue>
            <SimResultSub>前年 ¥{fmtCurrency(scenario.lyMonthly)}</SimResultSub>
          </SimResultCard>
        </SimResultGrid>

        <SimChartWrap>
          <SimChartLbl>月内 日次推移（残期間予測）</SimChartLbl>
          <ProjectionBarChart
            scenario={scenario}
            dailyProjection={vm.dailyProjection}
            currentDay={vm.kpis.currentDay}
          />
        </SimChartWrap>
      </SimInputSection>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────
// 行レンダリング (ドリル展開 inline 対応)
// ─────────────────────────────────────────────────────────

interface RowProps {
  readonly row: SimulatorWidgetRow
  readonly fmtCurrency: CurrencyFormatter
  readonly currentDay: number
  readonly drill: DrillKey | null
  readonly onToggleDrill: (k: DrillKey) => void
  readonly scenario: SimulatorScenario
  readonly weekStart: 0 | 1
  readonly onDayClick?: (day: number) => void
  readonly weatherIcons?: WeatherIconMaps
}

const RowRender = memo(function RowRender({
  row,
  fmtCurrency,
  currentDay,
  drill,
  onToggleDrill,
  scenario,
  weekStart,
  onDayClick,
  weatherIcons,
}: RowProps) {
  if (row.group) {
    return (
      <GroupRow>
        <td colSpan={6}>{row.group}</td>
      </GroupRow>
    )
  }

  const isOpen = row.drillKey != null && drill === row.drillKey
  const RowComp = row.highlight ? HighlightRow : row.drillKey ? ClickableTr : Tr
  const wrapLabel = (node: React.ReactNode) => (row.small ? <SmallText>{node}</SmallText> : node)

  return (
    <>
      <RowComp
        onClick={row.drillKey ? () => onToggleDrill(row.drillKey!) : undefined}
        aria-expanded={row.drillKey ? isOpen : undefined}
      >
        <Td>
          {row.drillKey && <DrillCaret>{isOpen ? '▾' : '▸'}</DrillCaret>}
          {wrapLabel(row.lbl)}
        </Td>
        <Td>{row.val != null ? wrapLabel(<>¥{fmtCurrency(row.val)}</>) : '—'}</Td>
        <Td>{row.ly != null ? `¥${fmtCurrency(row.ly)}` : '—'}</Td>
        <Td>{renderDiff(row.yoy)}</Td>
        <Td>{renderDiff(row.ach)}</Td>
        <Td>
          {row.strip != null ? (
            <StripChart
              data={row.strip}
              highlightRange={row.stripRange}
              currentDay={currentDay}
              variant={row.stripType}
            />
          ) : null}
        </Td>
      </RowComp>
      {isOpen && row.drillKey && (
        <DrillRow>
          <td colSpan={6}>
            <DrilldownPanel
              scenario={scenario}
              weekStart={weekStart}
              fmtCurrency={fmtCurrency}
              kind={row.drillKey}
              currentDay={currentDay}
              onDayClick={onDayClick}
              weatherIcons={weatherIcons}
            />
          </td>
        </DrillRow>
      )}
    </>
  )
})

function renderDiff(pctValue: number | null | undefined) {
  if (pctValue == null) return <DiffNeutral>—</DiffNeutral>
  const formatted = `${pctValue.toFixed(1)}%`
  if (pctValue >= 100) return <DiffPositive>{formatted}</DiffPositive>
  return <DiffNegative>{formatted}</DiffNegative>
}

function renderFormula(
  mode: 'yoy' | 'ach' | 'dow',
  dowBase: 'yoy' | 'ach',
  vm: SimulatorWidgetVm,
  fmtCurrency: CurrencyFormatter,
) {
  const diffClass = vm.landingDiff >= 0 ? 'diff-ok' : 'diff-bad'
  const baseLabel = dowBase === 'yoy' ? '前年' : '予算'
  const baseAmount = mode === 'yoy' ? vm.kpis.remLY : mode === 'ach' ? vm.kpis.remBudget : null

  return (
    <>
      {mode === 'dow' ? (
        <>
          残期間売上 = Σ(各日 {baseLabel} × 曜日係数) ={' '}
          <strong>¥{fmtCurrency(vm.remainingSales)}</strong>
        </>
      ) : (
        <>
          残期間売上 = ¥{fmtCurrency(baseAmount ?? 0)} × {vm.curInput.toFixed(1)}% ={' '}
          <strong>¥{fmtCurrency(vm.remainingSales)}</strong>
        </>
      )}{' '}
      → 月末着地 <strong className={diffClass}>¥{fmtCurrency(vm.finalLanding)}</strong>（月間予算比{' '}
      <strong className={diffClass}>
        {vm.landingDiff >= 0 ? '+' : ''}¥{fmtCurrency(vm.landingDiff)} /{' '}
        {vm.finalVsBudget != null ? formatPercent(vm.finalVsBudget / 100) : '—'}
      </strong>
      ）
    </>
  )
}
