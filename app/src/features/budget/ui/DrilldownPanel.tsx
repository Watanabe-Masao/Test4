/**
 * DrilldownPanel — 週別 / 曜日別の集計テーブル
 *
 * Phase 1 domain の `aggregateWeeks` / `aggregateDowAverages` を呼び、
 * 全期間 (月初〜月末) の集計を表示する。ユーザーは「なぜこの達成率か」を
 * 1 画面で追える。
 *
 * Phase 3.5 MVP: テーブルのみ (ECharts チャートは Phase 3.6 で追加)
 *
 * @responsibility R:widget
 */
import {
  aggregateDowAverages,
  aggregateWeeks,
  type SimulatorScenario,
} from '@/domain/calculations/budgetSimulator'
import { Card, CardTitle } from '@/presentation/components/common/layout'
import { Table, TableWrapper, Th, Td, Tr } from '@/presentation/pages/Insight/InsightPage.styles'
import type { InsightData } from '@/presentation/pages/Insight/useInsightData'
import {
  DiffNegative,
  DiffPositive,
  DiffNeutral,
  DrillSection,
  DrillTitle,
} from './BudgetSimulatorWidget.styles'

interface Props {
  readonly scenario: SimulatorScenario
  readonly weekStart: 0 | 1
  readonly d: InsightData
}

export function DrilldownPanel({ scenario, weekStart, d }: Props) {
  const dow = aggregateDowAverages(scenario)
  const weeks = aggregateWeeks(scenario, weekStart)

  return (
    <Card>
      <CardTitle>ドリルダウン集計</CardTitle>

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
                    <Td>¥{d.fmtCurrency(row.budgetTotal)}</Td>
                    <Td>¥{d.fmtCurrency(row.actualTotal)}</Td>
                    <Td>¥{d.fmtCurrency(row.lyTotal)}</Td>
                    <Td>¥{d.fmtCurrency(row.actualAvg)}</Td>
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
                  <Td>¥{d.fmtCurrency(w.budgetTotal)}</Td>
                  <Td>¥{d.fmtCurrency(w.actualTotal)}</Td>
                  <Td>¥{d.fmtCurrency(w.lyTotal)}</Td>
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
