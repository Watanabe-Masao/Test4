/**
 * DrilldownPanel — drill 対象 (kind) に応じた分析ビュー
 *
 * プロトタイプ同様に、クリックされた KPI 行の種別 (kind) に応じて
 * 表示するデータシリーズを切替える。
 *
 * - 月間売上予算 / 経過予算 / 残期間予算: 予算系列 (dailyBudget) を表示、前年 (lyDaily) と比較
 * - 経過実績: 実績系列 (actualDaily) を表示、前年 (lyDaily) と比較
 *
 * ビュー:
 * - カレンダー (全期間)
 * - 日別棒グラフ (実績 + 前年 + 移動平均)
 * - 曜日別テーブル (予算 vs 前年)
 * - 週別テーブル (予算 vs 前年)
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
import { DrillCalendar } from './DrillCalendar'
import type { DrillKey } from './BudgetSimulatorWidget.vm'

type Fmt = UnifiedWidgetContext['fmtCurrency']

interface Props {
  readonly scenario: SimulatorScenario
  readonly weekStart: 0 | 1
  readonly fmtCurrency: Fmt
  /** どの KPI 行からの drill か。系列選択・表示切替に使う */
  readonly kind: DrillKey
  /** 基準日 (1-based)。経過 drill のとき範囲指定に使う */
  readonly currentDay: number
}

// ─── drill 種別 → 表示系列のマップ ───

interface DrillViewSpec {
  readonly primarySeries: readonly number[]
  readonly primaryLabel: string
  readonly compareSeries: readonly number[] | null
  readonly compareLabel: string
  /** カレンダー・チャートのデータ範囲 [start, end] (1-based) */
  readonly rangeStart: number
  readonly rangeEnd: number
  readonly sectionTitle: string
}

function resolveView(
  kind: DrillKey,
  scenario: SimulatorScenario,
  currentDay: number,
): DrillViewSpec {
  const { dailyBudget, actualDaily, lyDaily, daysInMonth } = scenario
  switch (kind) {
    case 'elapsedActual':
      return {
        primarySeries: actualDaily,
        primaryLabel: '実績',
        compareSeries: lyDaily,
        compareLabel: '前年',
        rangeStart: 1,
        rangeEnd: currentDay,
        sectionTitle: '経過実績のドリル (1日〜' + currentDay + '日)',
      }
    case 'elapsedBudget':
      return {
        primarySeries: dailyBudget,
        primaryLabel: '予算',
        compareSeries: lyDaily,
        compareLabel: '前年',
        rangeStart: 1,
        rangeEnd: currentDay,
        sectionTitle: '経過予算のドリル (1日〜' + currentDay + '日)',
      }
    case 'remBudget':
      return {
        primarySeries: dailyBudget,
        primaryLabel: '予算',
        compareSeries: lyDaily,
        compareLabel: '前年',
        rangeStart: currentDay + 1,
        rangeEnd: daysInMonth,
        sectionTitle: `残期間予算のドリル (${currentDay + 1}日〜${daysInMonth}日)`,
      }
    case 'monthlyBudget':
    default:
      return {
        primarySeries: dailyBudget,
        primaryLabel: '予算',
        compareSeries: lyDaily,
        compareLabel: '前年',
        rangeStart: 1,
        rangeEnd: daysInMonth,
        sectionTitle: '月間売上予算のドリル (1日〜' + daysInMonth + '日)',
      }
  }
}

export function DrilldownPanel({ scenario, weekStart, fmtCurrency, kind, currentDay }: Props) {
  const view = resolveView(kind, scenario, currentDay)

  // 曜日別 / 週別 は全期間集計 (予算 vs 前年)
  const dow = useMemo(() => aggregateDowAverages(scenario), [scenario])
  const weeks = useMemo(() => aggregateWeeks(scenario, weekStart), [scenario, weekStart])

  return (
    <Card>
      <CardTitle>{view.sectionTitle}</CardTitle>

      {/* ── カレンダービュー ── */}
      <DrillSection>
        <DrillTitle>
          日別 カレンダー ({view.rangeStart}〜{view.rangeEnd}日)
        </DrillTitle>
        <DrillCalendar
          scenario={scenario}
          data={view.primarySeries}
          compare={view.compareSeries}
          compareLabel={view.compareLabel}
          rangeStart={view.rangeStart}
          rangeEnd={view.rangeEnd}
          weekStart={weekStart}
          fmtCurrency={fmtCurrency}
        />
      </DrillSection>

      {/* ── 日別棒グラフ (当期 VS 前年) ── */}
      <DrillSection>
        <DrillTitle>
          日別 推移（{view.primaryLabel} VS {view.compareLabel}）
        </DrillTitle>
        <DailyBarChart
          data={view.primarySeries}
          compare={view.compareSeries}
          label={view.primaryLabel}
          compareLabel={view.compareLabel}
          title=""
          height={260}
        />
      </DrillSection>

      {/* ── 曜日別テーブル (予算 vs 前年) ── */}
      <DrillSection>
        <DrillTitle>曜日別 (全期間・予算 vs 前年)</DrillTitle>
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <Th>曜日</Th>
                <Th>日数</Th>
                <Th>予算合計</Th>
                <Th>前年合計</Th>
                <Th>予算の前年比</Th>
              </tr>
            </thead>
            <tbody>
              {dow.map((row) => {
                // 予算 / 前年 — 実績は月後半未達日が 0 のため誤解を生むため本テーブルでは表示せず
                const yoy = row.lyTotal > 0 ? (row.budgetTotal / row.lyTotal) * 100 : null
                return (
                  <Tr key={row.dow}>
                    <Td>{row.label}</Td>
                    <Td>{row.count}</Td>
                    <Td>¥{fmtCurrency(row.budgetTotal)}</Td>
                    <Td>¥{fmtCurrency(row.lyTotal)}</Td>
                    <Td>{renderPct(yoy)}</Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        </TableWrapper>
      </DrillSection>

      {/* ── 週別テーブル (予算 vs 前年) ── */}
      <DrillSection>
        <DrillTitle>週別 (全期間・予算 vs 前年)</DrillTitle>
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <Th>週</Th>
                <Th>期間</Th>
                <Th>予算合計</Th>
                <Th>前年合計</Th>
                <Th>予算の前年比</Th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => {
                const budgetYoY = w.lyTotal > 0 ? (w.budgetTotal / w.lyTotal) * 100 : null
                return (
                  <Tr key={w.weekIndex}>
                    <Td>第{w.weekIndex + 1}週</Td>
                    <Td>
                      {w.startDay}日〜{w.endDay}日
                    </Td>
                    <Td>¥{fmtCurrency(w.budgetTotal)}</Td>
                    <Td>¥{fmtCurrency(w.lyTotal)}</Td>
                    <Td>{renderPct(budgetYoY)}</Td>
                  </Tr>
                )
              })}
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
