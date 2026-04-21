/**
 * 予算達成シミュレーター Widget
 *
 * InsightPage に embed する widget。月内の任意の基準日から月末着地を
 * リアルタイム試算する。プロトタイプ骨格を本番アーキテクチャに移植。
 *
 * props は既存の `BudgetTabContent` と同じ (InsightData + StoreResult + onExplain)。
 *
 * Phase 3 MVP: KPI テーブル + 基準日スライダー + モード切替 + yoy/ach 入力 + dow 簡易入力。
 * ドリルダウン / 日別 override カレンダー / チャートは後続 (Phase 3.5+)。
 *
 * @responsibility R:widget
 */
import { Card, CardTitle } from '@/presentation/components/common/layout'
import { Chip, ChipGroup } from '@/presentation/components/common/forms'
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
  DayInputRow,
  DayInputLabel,
  DayInputField,
  SliderRow,
  SliderLabel,
  SliderInput,
  ModeInputPanel,
  DowInputsGrid,
  DowInputCell,
  GroupRow,
  HighlightRow,
  SmallText,
  DiffPositive,
  DiffNegative,
  DiffNeutral,
} from './BudgetSimulatorWidget.styles'

interface Props {
  readonly d: InsightData
  readonly r: StoreResult
  readonly onExplain: (metricId: MetricId) => void
}

const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const

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
      <Card>
        <CardTitle>
          基準日: {d.year}年 {d.month}月 {vm.kpis.currentDay}日 （残 {vm.kpis.remainingDays}日）
        </CardTitle>
        <SliderRow>
          <SliderLabel>1日</SliderLabel>
          <SliderInput
            type="range"
            min={1}
            max={scenario.daysInMonth}
            value={vm.kpis.currentDay}
            onChange={(e) => state.setCurrentDay(Number(e.target.value))}
            aria-label="基準日スライダー"
          />
          <SliderLabel>{scenario.daysInMonth}日</SliderLabel>
        </SliderRow>
      </Card>

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
      <ModeInputPanel>
        {state.mode === 'yoy' && (
          <DayInputRow>
            <DayInputLabel htmlFor="sim-yoy-input">残期間の前年比 (%)</DayInputLabel>
            <DayInputField
              id="sim-yoy-input"
              type="number"
              min={0}
              step={1}
              value={state.yoyInput}
              onChange={(e) => state.setYoyInput(Number(e.target.value))}
            />
          </DayInputRow>
        )}
        {state.mode === 'ach' && (
          <DayInputRow>
            <DayInputLabel htmlFor="sim-ach-input">残期間の予算達成率 (%)</DayInputLabel>
            <DayInputField
              id="sim-ach-input"
              type="number"
              min={0}
              step={1}
              value={state.achInput}
              onChange={(e) => state.setAchInput(Number(e.target.value))}
            />
          </DayInputRow>
        )}
        {state.mode === 'dow' && (
          <>
            <ToggleSection>
              <ChipGroup>
                <Chip $active={state.dowBase === 'yoy'} onClick={() => state.setDowBase('yoy')}>
                  基準: 前年
                </Chip>
                <Chip $active={state.dowBase === 'ach'} onClick={() => state.setDowBase('ach')}>
                  基準: 予算
                </Chip>
              </ChipGroup>
            </ToggleSection>
            <DowInputsGrid>
              {DOW_LABELS.map((label, idx) => (
                <DowInputCell key={label}>
                  <label htmlFor={`sim-dow-${idx}`}>{label}</label>
                  <DayInputField
                    id={`sim-dow-${idx}`}
                    type="number"
                    min={0}
                    step={1}
                    value={state.dowInputs[idx]}
                    onChange={(e) => {
                      const n = Number(e.target.value)
                      const next = [...state.dowInputs] as [
                        number,
                        number,
                        number,
                        number,
                        number,
                        number,
                        number,
                      ]
                      next[idx] = n
                      state.setDowInputs(next)
                    }}
                  />
                </DowInputCell>
              ))}
            </DowInputsGrid>
          </>
        )}
      </ModeInputPanel>

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
