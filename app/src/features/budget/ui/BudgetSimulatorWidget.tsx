/**
 * 予算達成シミュレーター Widget
 *
 * InsightPage に embed する widget。月内の任意の基準日から月末着地を
 * リアルタイム試算する。プロトタイプ骨格を本番アーキテクチャに移植。
 *
 * props は既存の `BudgetTabContent` と同じ (InsightData + StoreResult + onExplain)。
 *
 * Phase 3 MVP: KPI テーブル + 基準日スライダー + モード切替 + yoy/ach/dow 入力
 * Phase 3.5: サブコンポーネント分離 + DayCalendarInput + DrilldownPanel
 * Phase 3.6 (予定): ECharts による StripChart / DailyBarChart / ProjectionBarChart
 *
 * @responsibility R:widget
 */
import { Chip, ChipGroup } from '@/presentation/components/common/forms'
import { Card, CardTitle } from '@/presentation/components/common/layout'
import { KpiCard, KpiGrid } from '@/presentation/components/common/tables'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import type { MetricId } from '@/domain/models/analysis'
import type { StoreResult } from '@/domain/models/storeTypes'
import type { InsightData } from '@/presentation/pages/Insight/useInsightData'
import {
  Table,
  TableWrapper,
  Td,
  Th,
  Tr,
  ToggleSection,
} from '@/presentation/pages/Insight/InsightPage.styles'
import { useSimulatorScenario } from '../application/useSimulatorScenario'
import { useSimulatorState } from '../application/useSimulatorState'
import { buildSimulatorWidgetVm, type SimulatorWidgetRow } from './BudgetSimulatorWidget.vm'
import {
  DiffNegative,
  DiffNeutral,
  DiffPositive,
  GroupRow,
  HighlightRow,
  SmallText,
} from './BudgetSimulatorWidget.styles'
import { TimelineSlider } from './TimelineSlider'
import { RemainingInputPanel } from './RemainingInputPanel'
import { DayCalendarInput } from './DayCalendarInput'
import { DrilldownPanel } from './DrilldownPanel'

interface Props {
  readonly d: InsightData
  readonly r: StoreResult
  readonly onExplain: (metricId: MetricId) => void
}

export function BudgetSimulatorWidget({ d, r, onExplain }: Props) {
  const scenario = useSimulatorScenario({
    result: r,
    prevYear: d.prevYear,
    year: d.year,
    month: d.month,
  })

  const state = useSimulatorState(r.elapsedDays || 1, scenario.daysInMonth)

  const vm = buildSimulatorWidgetVm({ scenario, state })

  return (
    <>
      {/* ── KPI Grid (上段サマリ) ── */}
      <KpiGrid>
        <KpiCard
          label="月末着地見込"
          value={d.fmtCurrency(vm.finalLanding)}
          subText={`予算比: ${vm.finalVsBudget != null ? d.formatPercent(vm.finalVsBudget / 100) : '—'}`}
          accent={
            vm.finalVsBudget != null && vm.finalVsBudget >= 100
              ? sc.positive
              : vm.finalVsBudget != null && vm.finalVsBudget >= 95
                ? palette.primary
                : sc.negative
          }
          trend={
            vm.finalVsBudget != null && vm.finalVsBudget >= 100
              ? { direction: 'up', label: '達成見込' }
              : vm.finalVsBudget != null && vm.finalVsBudget >= 95
                ? { direction: 'flat', label: '微妙' }
                : { direction: 'down', label: '未達見込' }
          }
        />
        <KpiCard
          label="経過実績"
          value={d.fmtCurrency(vm.kpis.elapsedActual)}
          subText={`${vm.kpis.currentDay}/${scenario.daysInMonth}日経過`}
          accent={palette.primary}
        />
        <KpiCard
          label="残期間必要売上"
          value={d.fmtCurrency(vm.kpis.requiredRemaining)}
          subText={`残${vm.kpis.remainingDays}日`}
          accent={palette.infoDark}
          onClick={() => onExplain('remainingBudget')}
        />
        <KpiCard
          label="予算達成率 (実績)"
          value={
            vm.kpis.elapsedAchievement != null
              ? d.formatPercent(vm.kpis.elapsedAchievement / 100)
              : '—'
          }
          subText={`経過予算: ${d.fmtCurrency(vm.kpis.elapsedBudget)}`}
          accent={sc.achievement(
            vm.kpis.elapsedAchievement != null ? vm.kpis.elapsedAchievement / 100 : 0,
          )}
          onClick={() => onExplain('budgetProgressRate')}
        />
      </KpiGrid>

      {/* ── 基準日スライダー ── */}
      <TimelineSlider
        year={d.year}
        month={d.month}
        currentDay={vm.kpis.currentDay}
        daysInMonth={scenario.daysInMonth}
        remainingDays={vm.kpis.remainingDays}
        onChange={state.setCurrentDay}
      />

      {/* ── モード切替 (残期間シミュレーション) ── */}
      <ToggleSection>
        <ChipGroup>
          <Chip $active={state.mode === 'yoy'} onClick={() => state.setMode('yoy')}>
            前年比
          </Chip>
          <Chip $active={state.mode === 'ach'} onClick={() => state.setMode('ach')}>
            予算達成率
          </Chip>
          <Chip $active={state.mode === 'dow'} onClick={() => state.setMode('dow')}>
            曜日別
          </Chip>
        </ChipGroup>
      </ToggleSection>

      {/* ── モード別入力 ── */}
      <RemainingInputPanel
        mode={state.mode}
        yoyInput={state.yoyInput}
        achInput={state.achInput}
        dowInputs={state.dowInputs}
        dowBase={state.dowBase}
        onYoyChange={state.setYoyInput}
        onAchChange={state.setAchInput}
        onDowChange={state.setDowInputs}
        onDowBaseChange={state.setDowBase}
      />

      {/* ── 日別 override (dow モード時のみ) ── */}
      {state.mode === 'dow' && (
        <DayCalendarInput
          year={d.year}
          month={d.month}
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

      {/* ── KPI テーブル (4 セクション) ── */}
      <Card>
        <CardTitle>予算達成シミュレーション</CardTitle>
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <Th>項目</Th>
                <Th>金額</Th>
                <Th>前年実績</Th>
                <Th>前年比</Th>
                <Th>達成率</Th>
              </tr>
            </thead>
            <tbody>{vm.rows.map((row, i) => renderRow(row, i, d))}</tbody>
          </Table>
        </TableWrapper>
      </Card>

      {/* ── ドリルダウン (週別・曜日別) ── */}
      <DrilldownPanel scenario={scenario} weekStart={state.weekStart} d={d} />
    </>
  )
}

function renderRow(row: SimulatorWidgetRow, i: number, d: InsightData) {
  if (row.group) {
    return (
      <GroupRow key={`g-${i}`}>
        <td colSpan={5}>{row.group}</td>
      </GroupRow>
    )
  }

  const RowComponent = row.highlight ? HighlightRow : Tr
  const LabelWrapper = row.small
    ? SmallText
    : ({ children }: { children: React.ReactNode }) => <>{children}</>

  return (
    <RowComponent key={`r-${i}`}>
      <Td>
        <LabelWrapper>{row.lbl}</LabelWrapper>
      </Td>
      <Td>{row.val != null ? <LabelWrapper>¥{d.fmtCurrency(row.val)}</LabelWrapper> : '—'}</Td>
      <Td>{row.ly != null ? `¥${d.fmtCurrency(row.ly)}` : '—'}</Td>
      <Td>{renderDiff(row.yoy)}</Td>
      <Td>{renderDiff(row.ach)}</Td>
    </RowComponent>
  )
}

function renderDiff(pctValue: number | null | undefined) {
  if (pctValue == null) return <DiffNeutral>—</DiffNeutral>
  const formatted = `${pctValue.toFixed(1)}%`
  if (pctValue >= 100) return <DiffPositive>{formatted}</DiffPositive>
  return <DiffNegative>{formatted}</DiffNegative>
}
