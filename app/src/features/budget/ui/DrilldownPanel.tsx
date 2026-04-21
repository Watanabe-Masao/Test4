/**
 * DrilldownPanel — 週別 / 曜日別の集計テーブル + 日別バーチャート
 *
 * Phase 1 domain の `aggregateWeeks` / `aggregateDowAverages` を呼び、
 * 全期間 (月初〜月末) の集計を表示する。
 *
 * @responsibility R:widget
 */
import { useMemo } from 'react'
import {
  aggregateDowAverages,
  aggregateWeeks,
  type SimulatorScenario,
} from '@/domain/calculations/budgetSimulator'
import { Card, CardTitle } from '@/presentation/components/common/layout'
import { Table, TableWrapper, Th, Td, Tr } from '@/presentation/pages/Insight/InsightPage.styles'
import type { UnifiedWidgetContext } from '@/presentation/components/widgets'
import {
  DiffNegative,
  DiffPositive,
  DiffNeutral,
  DrillSection,
  DrillTitle,
} from './BudgetSimulatorWidget.styles'
import { DailyBarChart } from './DailyBarChart'

type Fmt = UnifiedWidgetContext['fmtCurrency']

interface Props {
  readonly scenario: SimulatorScenario
  readonly weekStart: 0 | 1
  readonly fmtCurrency: Fmt
}

export function DrilldownPanel({ scenario, weekStart, fmtCurrency }: Props) {
  // scenario が変わるたびに再計算を避けるため memoize
  const dow = useMemo(() => aggregateDowAverages(scenario), [scenario])
  const weeks = useMemo(() => aggregateWeeks(scenario, weekStart), [scenario, weekStart])

  return (
    <Card>
      <CardTitle>ドリルダウン集計</CardTitle>

      <DrillSection>
        <DrillTitle>日別実績 + 7日移動平均 (全期間)</DrillTitle>
        <DailyBarChart
          data={scenario.actualDaily}
          compare={scenario.lyDaily}
          label="実績"
          compareLabel="前年"
          title=""
          height={240}
        />
      </DrillSection>

      <DrillSection>
        <DrillTitle>曜日別 (全期間)</DrillTitle>
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <Th>曜日</Th>
                <Th>日数</Th>
                <Th>予算合計</Th>
                <Th>実績合計</Th>
                <Th>前年合計</Th>
                <Th>実績平均/日</Th>
                <Th>前年比</Th>
              </tr>
            </thead>
            <tbody>
              {dow.map((row) => {
                const yoy = row.lyTotal > 0 ? (row.actualTotal / row.lyTotal) * 100 : null
                return (
                  <Tr key={row.dow}>
                    <Td>{row.label}</Td>
                    <Td>{row.count}</Td>
                    <Td>¥{fmtCurrency(row.budgetTotal)}</Td>
                    <Td>¥{fmtCurrency(row.actualTotal)}</Td>
                    <Td>¥{fmtCurrency(row.lyTotal)}</Td>
                    <Td>¥{fmtCurrency(row.actualAvg)}</Td>
                    <Td>{renderPct(yoy)}</Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        </TableWrapper>
      </DrillSection>

      <DrillSection>
        <DrillTitle>週別 (全期間)</DrillTitle>
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <Th>週</Th>
                <Th>期間</Th>
                <Th>予算合計</Th>
                <Th>実績合計</Th>
                <Th>前年合計</Th>
                <Th>達成率</Th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <Tr key={w.weekIndex}>
                  <Td>第{w.weekIndex + 1}週</Td>
                  <Td>
                    {w.startDay}日〜{w.endDay}日
                  </Td>
                  <Td>¥{fmtCurrency(w.budgetTotal)}</Td>
                  <Td>¥{fmtCurrency(w.actualTotal)}</Td>
                  <Td>¥{fmtCurrency(w.lyTotal)}</Td>
                  <Td>{renderPct(w.achievement)}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrapper>
      </DrillSection>
    </Card>
  )
}

function renderPct(value: number | null) {
  if (value == null) return <DiffNeutral>—</DiffNeutral>
  const formatted = `${value.toFixed(1)}%`
  if (value >= 100) return <DiffPositive>{formatted}</DiffPositive>
  return <DiffNegative>{formatted}</DiffNegative>
}
