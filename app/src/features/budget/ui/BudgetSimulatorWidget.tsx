/**
 * 予算達成シミュレーター Widget
 *
 * プロトタイプ構造を踏襲:
 *   c-head (title + date + slider 横並び)
 *   c-table-wrap (KPI テーブル、行 click でドリル展開)
 *   c-sim-input-row (④ 入力セクション: mode / 入力 / 式 / ProjectionChart)
 *
 * UnifiedWidgetContext 直接依存で、InsightPage / Dashboard 等の任意ページで動作。
 *
 * @responsibility R:widget
 */
import { memo, useMemo, useState } from 'react'
import { formatPercent } from '@/domain/formatting'
import type { UnifiedWidgetContext } from '@/presentation/components/widgets'
import { Table, TableWrapper, Td, Th, Tr } from '@/presentation/pages/Insight/InsightPage.styles'
import { Card } from '@/presentation/components/common/layout'
import { dowOf } from '@/domain/calculations/budgetSimulator'
import { useSimulatorScenario } from '../application/useSimulatorScenario'
import { useSimulatorState } from '../application/useSimulatorState'
import {
  buildSimulatorWidgetVm,
  type DrillKey,
  type SimulatorWidgetRow,
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
  SimChartLbl,
  SimChartWrap,
  SimFormula,
  SimInputLabel,
  SimInputSection,
  SimulatorHeader,
  SmallText,
} from './BudgetSimulatorWidget.styles'
import { TimelineSlider } from './TimelineSlider'
import { RemainingInputPanel } from './RemainingInputPanel'
import { DayCalendarInput } from './DayCalendarInput'
import { DrilldownPanel } from './DrilldownPanel'
import { ProjectionBarChart } from './ProjectionBarChart'
import { StripChart } from './StripChart'

type Fmt = UnifiedWidgetContext['fmtCurrency']

interface Props {
  readonly ctx: UnifiedWidgetContext
}

const DOW_JP = ['日', '月', '火', '水', '木', '金', '土'] as const

export function BudgetSimulatorWidget({ ctx }: Props) {
  const { result, prevYear, year, month, fmtCurrency } = ctx

  const scenario = useSimulatorScenario({ result, prevYear, year, month })
  const state = useSimulatorState(result.elapsedDays || 1, scenario.daysInMonth)
  const vm = useMemo(() => buildSimulatorWidgetVm({ scenario, state }), [scenario, state])

  // 行 click で展開するドリルキー
  const [drill, setDrill] = useState<DrillKey | null>(null)
  const toggleDrill = (key: DrillKey) => setDrill((prev) => (prev === key ? null : key))

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
                onToggleDrill={toggleDrill}
                scenario={scenario}
                weekStart={state.weekStart}
              />
            ))}
          </tbody>
        </Table>
      </TableWrapper>

      {/* ── ④ 着地シミュレーター入力部 ── */}
      <SimInputSection>
        <SimInputLabel>④ 残期間の前提を入力</SimInputLabel>
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

        {/* dow モード時のみ日別 override カレンダー */}
        {state.mode === 'dow' && (
          <DayCalendarInput
            year={year}
            month={month}
            daysInMonth={scenario.daysInMonth}
            currentDay={vm.kpis.currentDay}
            dowInputs={state.dowInputs}
            dowBase={state.dowBase}
            dayOverrides={state.dayOverrides}
            weekStart={state.weekStart}
            onWeekStartChange={state.setWeekStart}
            onOverrideChange={state.setDayOverride}
            onOverrideClear={state.clearDayOverride}
            onResetAll={state.resetDayOverrides}
          />
        )}

        {/* 式表示 */}
        <SimFormula>{renderFormula(state.mode, state.dowBase, vm, fmtCurrency)}</SimFormula>

        {/* 日次推移チャート */}
        <SimChartWrap>
          <SimChartLbl>月内 日次推移（残期間予測）</SimChartLbl>
          <ProjectionBarChart
            dailyProjection={vm.dailyProjection}
            currentDay={vm.kpis.currentDay}
            daysInMonth={scenario.daysInMonth}
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
  readonly fmtCurrency: Fmt
  readonly currentDay: number
  readonly drill: DrillKey | null
  readonly onToggleDrill: (k: DrillKey) => void
  readonly scenario: Parameters<typeof DrilldownPanel>[0]['scenario']
  readonly weekStart: 0 | 1
}

const RowRender = memo(function RowRender({
  row,
  fmtCurrency,
  currentDay,
  drill,
  onToggleDrill,
  scenario,
  weekStart,
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
  const wrapLabel = (node: React.ReactNode) =>
    row.small ? <SmallText>{node}</SmallText> : node

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
            <DrilldownPanel scenario={scenario} weekStart={weekStart} fmtCurrency={fmtCurrency} />
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
  vm: ReturnType<typeof buildSimulatorWidgetVm>,
  fmtCurrency: Fmt,
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
