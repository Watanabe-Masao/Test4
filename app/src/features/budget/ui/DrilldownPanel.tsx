/**
 * DrilldownPanel — drill 対象 (kind) に応じた分析ビュー
 *
 * 仕様書 §06 Drilldown に準拠:
 * (1) サマリー: 合計/日平均/最高日/最低日/比較合計/比較比
 * (2) 比較対象切替 (elapsedActual のみ): 前年 / 予算
 * (3) カレンダービュー (全期間)
 * (4) 日別棒グラフ (当期 VS 比較)
 * (5) 曜日別集計テーブル
 * (6) 週別集計テーブル
 *
 * @responsibility R:widget
 */
import { useMemo, useState } from 'react'
import {
  aggregateDowAverages,
  aggregateWeeks,
  type SimulatorScenario,
} from '@/domain/calculations/budgetSimulator'
import { Card, CardTitle } from '@/presentation/components/common/layout'
import { Chip, ChipGroup } from '@/presentation/components/common/forms'
import { Table, TableWrapper, Th, Td, Tr } from '@/presentation/pages/Insight/InsightPage.styles'
import type { UnifiedWidgetContext } from '@/presentation/components/widgets'
import {
  DiffNegative,
  DiffPositive,
  DiffNeutral,
  DrillGroupHead,
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
  readonly kind: DrillKey
  readonly currentDay: number
  /** カレンダーセルをクリックした時の callback (省略でクリック不可) */
  readonly onDayClick?: (day: number) => void
}

// ─── drill 種別 → 表示系列のマップ ───

type CompareMode = 'ly' | 'budget'

interface DrillViewSpec {
  readonly primarySeries: readonly number[]
  readonly primaryLabel: string
  /** 比較切替可否 (elapsedActual のみ true) */
  readonly switchable: boolean
  /** デフォルト比較モード */
  readonly defaultCompareMode: CompareMode
  /** データが有効な範囲 [start, end] (1-based) */
  readonly rangeStart: number
  readonly rangeEnd: number
  readonly sectionTitle: string
}

function resolveView(
  kind: DrillKey,
  scenario: SimulatorScenario,
  currentDay: number,
): DrillViewSpec {
  const { dailyBudget, actualDaily, daysInMonth } = scenario
  switch (kind) {
    case 'elapsedActual':
      return {
        primarySeries: actualDaily,
        primaryLabel: '経過実績',
        switchable: true,
        defaultCompareMode: 'ly',
        rangeStart: 1,
        rangeEnd: currentDay,
        sectionTitle: `経過実績 の内訳 (1〜${currentDay}日)`,
      }
    case 'elapsedBudget':
      return {
        primarySeries: dailyBudget,
        primaryLabel: '経過予算',
        switchable: false,
        defaultCompareMode: 'ly',
        rangeStart: 1,
        rangeEnd: currentDay,
        sectionTitle: `経過予算 の内訳 (1〜${currentDay}日)`,
      }
    case 'remBudget':
      return {
        primarySeries: dailyBudget,
        primaryLabel: '残期間予算',
        switchable: false,
        defaultCompareMode: 'ly',
        rangeStart: currentDay + 1,
        rangeEnd: daysInMonth,
        sectionTitle: `残期間予算 の内訳 (${currentDay + 1}〜${daysInMonth}日)`,
      }
    case 'monthlyBudget':
    default:
      return {
        primarySeries: dailyBudget,
        primaryLabel: '月間予算',
        switchable: false,
        defaultCompareMode: 'ly',
        rangeStart: 1,
        rangeEnd: daysInMonth,
        sectionTitle: `月間売上予算 の内訳 (1〜${daysInMonth}日)`,
      }
  }
}

// ── サマリー計算 ──

interface Summary {
  readonly total: number
  readonly dailyAvg: number
  readonly maxDay: { readonly day: number; readonly value: number } | null
  readonly minDay: { readonly day: number; readonly value: number } | null
  readonly cmpTotal: number
  readonly cmpRatio: number | null // primary / compare × 100
}

function computeSummary(
  primary: readonly number[],
  compare: readonly number[] | null,
  rangeStart: number,
  rangeEnd: number,
): Summary {
  let total = 0
  let cmpTotal = 0
  let count = 0
  let max: Summary['maxDay'] = null
  let min: Summary['minDay'] = null

  for (let d = rangeStart; d <= rangeEnd; d++) {
    const v = primary[d - 1] ?? 0
    total += v
    count++
    if (compare) cmpTotal += compare[d - 1] ?? 0
    if (v > 0 && (max == null || v > max.value)) max = { day: d, value: v }
    if (v > 0 && (min == null || v < min.value)) min = { day: d, value: v }
  }
  const dailyAvg = count > 0 ? total / count : 0
  const cmpRatio = cmpTotal > 0 ? (total / cmpTotal) * 100 : null
  return { total, dailyAvg, maxDay: max, minDay: min, cmpTotal, cmpRatio }
}

const DOW_JP = ['日', '月', '火', '水', '木', '金', '土'] as const

function dowLabelOf(scenario: SimulatorScenario, day: number): string {
  const dw = new Date(scenario.year, scenario.month - 1, day).getDay()
  return DOW_JP[dw]
}

// ─── コンポーネント ───

export function DrilldownPanel({
  scenario,
  weekStart,
  fmtCurrency,
  kind,
  currentDay,
  onDayClick,
}: Props) {
  const view = resolveView(kind, scenario, currentDay)

  // 比較モード (elapsedActual のみ切替可、他は固定)
  const [compareMode, setCompareMode] = useState<CompareMode>(view.defaultCompareMode)
  const effectiveCompareMode = view.switchable ? compareMode : 'ly'

  const compareSeries = effectiveCompareMode === 'ly' ? scenario.lyDaily : scenario.dailyBudget
  const compareLabel = effectiveCompareMode === 'ly' ? '前年' : '予算'

  // サマリー
  const summary = useMemo(
    () => computeSummary(view.primarySeries, compareSeries, view.rangeStart, view.rangeEnd),
    [view.primarySeries, compareSeries, view.rangeStart, view.rangeEnd],
  )

  // 曜日別・週別は drill 種別に応じた範囲で集計
  // - ① 月間 (monthlyBudget): 全期間 1..daysInMonth
  // - ② 経過 (elapsedBudget / elapsedActual): 1..currentDay
  // - ③ 残期間 (remBudget): currentDay+1..daysInMonth
  const dow = useMemo(
    () => aggregateDowAverages(scenario, view.rangeStart, view.rangeEnd),
    [scenario, view.rangeStart, view.rangeEnd],
  )
  const weeks = useMemo(
    () => aggregateWeeks(scenario, weekStart, view.rangeStart, view.rangeEnd),
    [scenario, weekStart, view.rangeStart, view.rangeEnd],
  )

  return (
    <Card>
      <CardTitle>{view.sectionTitle}</CardTitle>

      {/* (1) 比較モードトグル + (2) サマリー行 */}
      <SummaryRow
        summary={summary}
        compareLabel={compareLabel}
        fmtCurrency={fmtCurrency}
        scenario={scenario}
        showToggle={view.switchable}
        compareMode={effectiveCompareMode}
        onCompareModeChange={setCompareMode}
      />

      {/* (3) カレンダービュー */}
      <DrillSection>
        <DrillTitle>
          日別 カレンダー ({view.rangeStart}〜{view.rangeEnd}日)
        </DrillTitle>
        <DrillCalendar
          scenario={scenario}
          data={view.primarySeries}
          compare={compareSeries}
          compareLabel={compareLabel}
          rangeStart={view.rangeStart}
          rangeEnd={view.rangeEnd}
          weekStart={weekStart}
          fmtCurrency={fmtCurrency}
          onDayClick={onDayClick}
        />
      </DrillSection>

      {/* (4) 日別棒グラフ */}
      <DrillSection>
        <DrillTitle>
          日別 推移（{view.primaryLabel} VS {compareLabel}）
        </DrillTitle>
        <DailyBarChart
          data={view.primarySeries}
          compare={compareSeries}
          label={view.primaryLabel}
          compareLabel={compareLabel}
          title=""
          height={260}
        />
      </DrillSection>

      {/* (5) 曜日別テーブル — 今年 / 前年 / 比較 の 3 グループ */}
      <DrillSection>
        <DrillTitle>
          曜日別 ({view.rangeStart}〜{view.rangeEnd}日・予算 vs 前年)
        </DrillTitle>
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <DrillGroupHead rowSpan={2}>曜日</DrillGroupHead>
                <DrillGroupHead colSpan={3}>今年の月間予算 ({scenario.year}年)</DrillGroupHead>
                <DrillGroupHead colSpan={3}>前年実績 ({scenario.year - 1}年)</DrillGroupHead>
                <DrillGroupHead colSpan={2}>比較</DrillGroupHead>
              </tr>
              <tr>
                <Th>日数</Th>
                <Th>予算合計</Th>
                <Th>曜日平均</Th>
                <Th>日数</Th>
                <Th>前年合計</Th>
                <Th>曜日平均</Th>
                <Th>差異</Th>
                <Th>予算前年比</Th>
              </tr>
            </thead>
            <tbody>
              {dow.map((row) => {
                // 前年暦 (year-1, month) の曜日別日数を計算
                const prevCount = countDowInRange(
                  scenario.year - 1,
                  scenario.month,
                  row.dow,
                  view.rangeStart,
                  view.rangeEnd,
                )
                const currentDowAvg = row.count > 0 ? row.budgetTotal / row.count : 0
                const prevDowAvg = prevCount > 0 ? row.lyTotal / prevCount : 0
                const diff = row.budgetTotal - row.lyTotal
                const yoy = row.lyTotal > 0 ? (row.budgetTotal / row.lyTotal) * 100 : null
                return (
                  <Tr key={row.dow}>
                    <Td>{row.label}</Td>
                    {/* 今年 */}
                    <Td>{row.count}日</Td>
                    <Td>¥{fmtCurrency(row.budgetTotal)}</Td>
                    <Td>¥{fmtCurrency(currentDowAvg)}</Td>
                    {/* 前年 */}
                    <Td>{prevCount}日</Td>
                    <Td>¥{fmtCurrency(row.lyTotal)}</Td>
                    <Td>¥{fmtCurrency(prevDowAvg)}</Td>
                    {/* 比較 */}
                    <Td>
                      {diff >= 0 ? '+' : ''}¥{fmtCurrency(diff)}
                    </Td>
                    <Td>{renderPct(yoy)}</Td>
                  </Tr>
                )
              })}
            </tbody>
          </Table>
        </TableWrapper>
      </DrillSection>

      {/* (6) 週別テーブル */}
      <DrillSection>
        <DrillTitle>
          週別 ({view.rangeStart}〜{view.rangeEnd}日・予算 vs 前年)
        </DrillTitle>
        <TableWrapper>
          <Table>
            <thead>
              <tr>
                <Th>週</Th>
                <Th>期間</Th>
                <Th>予算合計</Th>
                <Th>前年合計</Th>
                <Th>差異</Th>
                <Th>予算前年比</Th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => {
                const budgetYoY = w.lyTotal > 0 ? (w.budgetTotal / w.lyTotal) * 100 : null
                const diff = w.budgetTotal - w.lyTotal
                return (
                  <Tr key={w.weekIndex}>
                    <Td>第{w.weekIndex + 1}週</Td>
                    <Td>
                      {w.startDay}日〜{w.endDay}日
                    </Td>
                    <Td>¥{fmtCurrency(w.budgetTotal)}</Td>
                    <Td>¥{fmtCurrency(w.lyTotal)}</Td>
                    <Td>
                      {diff >= 0 ? '+' : ''}¥{fmtCurrency(diff)}
                    </Td>
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

interface SummaryRowProps {
  readonly summary: Summary
  readonly compareLabel: string
  readonly fmtCurrency: Fmt
  readonly scenario: SimulatorScenario
  readonly showToggle: boolean
  readonly compareMode: CompareMode
  readonly onCompareModeChange: (m: CompareMode) => void
}

function SummaryRow({
  summary,
  compareLabel,
  fmtCurrency,
  scenario,
  showToggle,
  compareMode,
  onCompareModeChange,
}: SummaryRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem 1.5rem',
        padding: '0.5rem 0',
        alignItems: 'baseline',
      }}
    >
      {showToggle && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', opacity: 0.75 }}>比較:</span>
          <ChipGroup>
            <Chip $active={compareMode === 'ly'} onClick={() => onCompareModeChange('ly')}>
              前年
            </Chip>
            <Chip $active={compareMode === 'budget'} onClick={() => onCompareModeChange('budget')}>
              予算
            </Chip>
          </ChipGroup>
        </div>
      )}
      <SummaryStat label="合計" value={`¥${fmtCurrency(summary.total)}`} bold />
      <SummaryStat label="日平均" value={`¥${fmtCurrency(summary.dailyAvg)}`} />
      {summary.maxDay && (
        <SummaryStat
          label="最高"
          value={`¥${fmtCurrency(summary.maxDay.value)}`}
          sub={`${summary.maxDay.day}日(${dowLabelOf(scenario, summary.maxDay.day)})`}
        />
      )}
      {summary.minDay && (
        <SummaryStat
          label="最低"
          value={`¥${fmtCurrency(summary.minDay.value)}`}
          sub={`${summary.minDay.day}日(${dowLabelOf(scenario, summary.minDay.day)})`}
        />
      )}
      <SummaryStat label={`${compareLabel}合計`} value={`¥${fmtCurrency(summary.cmpTotal)}`} />
      {summary.cmpRatio != null && (
        <SummaryStat label={`${compareLabel}比`} value={renderPct(summary.cmpRatio)} />
      )}
    </div>
  )
}

function SummaryStat({
  label,
  value,
  sub,
  bold,
}: {
  readonly label: string
  readonly value: React.ReactNode
  readonly sub?: string
  readonly bold?: boolean
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
      <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>{label}</span>
      <span style={{ fontSize: bold ? '0.95rem' : '0.88rem', fontWeight: bold ? 700 : 500 }}>
        {value}
      </span>
      {sub && <span style={{ fontSize: '0.68rem', opacity: 0.55 }}>{sub}</span>}
    </div>
  )
}

function renderPct(value: number | null) {
  if (value == null) return <DiffNeutral>—</DiffNeutral>
  const formatted = `${value.toFixed(1)}%`
  if (value >= 100) return <DiffPositive>{formatted}</DiffPositive>
  return <DiffNegative>{formatted}</DiffNegative>
}

/**
 * 指定年月の [rangeStart, rangeEnd] (1-based, inclusive) における指定曜日の日数を数える。
 * 前年と今年で曜日の日数が異なるため、個別にカウントする必要がある。
 */
function countDowInRange(
  year: number,
  month: number,
  targetDow: number,
  rangeStart: number,
  rangeEnd: number,
): number {
  const daysInMonth = new Date(year, month, 0).getDate()
  const start = Math.max(1, rangeStart)
  const end = Math.min(daysInMonth, rangeEnd)
  let count = 0
  for (let d = start; d <= end; d++) {
    if (new Date(year, month - 1, d).getDay() === targetDow) count++
  }
  return count
}
