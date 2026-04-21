/**
 * 予算達成シミュレーター Widget
 *
 * UnifiedWidgetContext に直接依存することで、InsightPage 以外のページ
 * (Dashboard 等) でも利用可能。月内の任意の基準日から月末着地をリアルタイム試算。
 *
 * Phase 3 MVP: KPI テーブル + 基準日スライダー + モード切替 + yoy/ach/dow 入力
 * Phase 3.5: サブコンポーネント分離 + DayCalendarInput + DrilldownPanel
 * Phase 3.6: ECharts 経由の ProjectionBarChart / DailyBarChart / StripChart
 * Phase 3.7: ctx 直接利用に変更 (InsightData 非依存化)
 *
 * @responsibility R:widget
 */
import { useMemo } from 'react'
import { Chip, ChipGroup } from '@/presentation/components/common/forms'
import { Card, CardTitle } from '@/presentation/components/common/layout'
import { KpiCard, KpiGrid } from '@/presentation/components/common/tables'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'
import { formatPercent } from '@/domain/formatting'
import type { UnifiedWidgetContext } from '@/presentation/components/widgets'
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
import { ProjectionBarChart } from './ProjectionBarChart'
import { StripChart } from './StripChart'

type Fmt = UnifiedWidgetContext['fmtCurrency']

interface Props {
  readonly ctx: UnifiedWidgetContext
}

export function BudgetSimulatorWidget({ ctx }: Props) {
  const { result, prevYear, year, month, fmtCurrency, onExplain } = ctx

  const scenario = useSimulatorScenario({ result, prevYear, year, month })

  const state = useSimulatorState(result.elapsedDays || 1, scenario.daysInMonth)

  // 頻繁な state 更新 (スライダー・入力変更) に対し計算を 1 回に抑える
  const vm = useMemo(() => buildSimulatorWidgetVm({ scenario, state }), [scenario, state])

  return (
    <>
      {/* ── KPI Grid (上段サマリ) ── */}
      <KpiGrid>
        <KpiCard
          label="月末着地見込"
          value={fmtCurrency(vm.finalLanding)}
          subText={`予算比: ${vm.finalVsBudget != null ? formatPercent(vm.finalVsBudget / 100) : '—'}`}
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
          value={fmtCurrency(vm.kpis.elapsedActual)}
          subText={`${vm.kpis.currentDay}/${scenario.daysInMonth}日経過`}
          accent={palette.primary}
        />
        <KpiCard
          label="残期間必要売上"
          value={fmtCurrency(vm.kpis.requiredRemaining)}
          subText={`残${vm.kpis.remainingDays}日`}
          accent={palette.infoDark}
          onClick={() => onExplain('remainingBudget')}
        />
        <KpiCard
          label="予算達成率 (実績)"
          value={
            vm.kpis.elapsedAchievement != null
              ? formatPercent(vm.kpis.elapsedAchievement / 100)
              : '—'
          }
          subText={`経過予算: ${fmtCurrency(vm.kpis.elapsedBudget)}`}
          accent={sc.achievement(
            vm.kpis.elapsedAchievement != null ? vm.kpis.elapsedAchievement / 100 : 0,
          )}
          onClick={() => onExplain('budgetProgressRate')}
        />
      </KpiGrid>

      {/* ── 基準日スライダー ── */}
      <TimelineSlider
        year={year}
        month={month}
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
                <Th>日次推移</Th>
              </tr>
            </thead>
            <tbody>
              {vm.rows.map((row, i) => renderRow(row, i, fmtCurrency, vm.kpis.currentDay))}
            </tbody>
          </Table>
        </TableWrapper>
      </Card>

      {/* ── ④用: 残期間予測バーチャート (ECharts) ── */}
      <ProjectionBarChart
        dailyProjection={vm.dailyProjection}
        currentDay={vm.kpis.currentDay}
        daysInMonth={scenario.daysInMonth}
      />

      {/* ── ドリルダウン (週別・曜日別 + 日別バーチャート) ── */}
      <DrilldownPanel scenario={scenario} weekStart={state.weekStart} fmtCurrency={fmtCurrency} />
    </>
  )
}

function renderRow(row: SimulatorWidgetRow, i: number, fmtCurrency: Fmt, currentDay: number) {
  if (row.group) {
    return (
      <GroupRow key={`g-${i}`}>
        <td colSpan={6}>{row.group}</td>
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
      <Td>{row.val != null ? <LabelWrapper>¥{fmtCurrency(row.val)}</LabelWrapper> : '—'}</Td>
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
    </RowComponent>
  )
}

function renderDiff(pctValue: number | null | undefined) {
  if (pctValue == null) return <DiffNeutral>—</DiffNeutral>
  const formatted = `${pctValue.toFixed(1)}%`
  if (pctValue >= 100) return <DiffPositive>{formatted}</DiffPositive>
  return <DiffNegative>{formatted}</DiffNegative>
}
