/**
 * DayCalendarInput — 日別カレンダー形式の override 入力
 *
 * 仕様書 §07 モード3 カレンダー個別入力 に準拠:
 * - 過去セル (≤ currentDay): 実績額 + 予算達成率 + 前年比 を read-only 表示
 * - 未来セル (> currentDay): % 入力 + ¥ 入力 (相互変換) + 予測達成率 + 予測前年比
 * - dayOverrides は曜日別 % より優先
 * - 週合計列 (W1〜W5): 予算合計 / 前年合計 / 予算前年比 (予算 vs 前年)
 * - 全日リセット / 週始まり切替あり
 *
 * セル描画は DayCellSlot に分離 (行数圧縮のため)。
 *
 * @responsibility R:form
 */
import { useMemo } from 'react'
import type { DowBase, DowFactors, SimulatorScenario } from '@/domain/calculations/budgetSimulator'
import { dowOf } from '@/domain/calculations/budgetSimulator'
import { Card, CardTitle } from '@/presentation/components/common/layout'
import { Chip, ChipGroup } from '@/presentation/components/common/forms'
import { ToggleSection } from '@/presentation/pages/Insight/InsightPage.styles'
import type { UnifiedWidgetContext } from '@/presentation/components/widgets'
import {
  DayCalendarGrid,
  DayCalendarHeaderCell,
  WeekTotalCell,
  WeekTotalLabel,
  WeekTotalRatio,
  WeekTotalSub,
  WeekTotalValue,
} from './BudgetSimulatorWidget.styles'
import { DayCellSlot } from './DayCalendarCell'
import { DowAverageRow } from './DowAverageRow'

type Fmt = UnifiedWidgetContext['fmtCurrency']

const DOW_LABELS_SUN_FIRST = ['日', '月', '火', '水', '木', '金', '土'] as const
const DOW_LABELS_MON_FIRST = ['月', '火', '水', '木', '金', '土', '日'] as const

interface Props {
  readonly scenario: SimulatorScenario
  readonly currentDay: number
  readonly dowInputs: DowFactors
  readonly dowBase: DowBase
  readonly dayOverrides: Readonly<Record<number, number>>
  readonly weekStart: 0 | 1
  readonly fmtCurrency: Fmt
  readonly onWeekStartChange: (s: 0 | 1) => void
  readonly onOverrideChange: (day: number, pct: number) => void
  readonly onOverrideClear: (day: number) => void
  readonly onResetAll: () => void
}

export function DayCalendarInput(props: Props) {
  const {
    scenario,
    currentDay,
    dowInputs,
    dowBase,
    dayOverrides,
    weekStart,
    fmtCurrency,
    onWeekStartChange,
    onOverrideChange,
    onOverrideClear,
    onResetAll,
  } = props

  const { year, month, daysInMonth } = scenario
  const headerLabels = weekStart === 0 ? DOW_LABELS_SUN_FIRST : DOW_LABELS_MON_FIRST

  // 7 日ずつ行分割 (leading/trailing pad 含む)
  const rows = useMemo(() => {
    const firstDow = dowOf(year, month, 1)
    const leadingPad = (firstDow - weekStart + 7) % 7
    const totalCells = leadingPad + daysInMonth
    const trailingPad = (7 - (totalCells % 7)) % 7
    const cells: Array<number | null> = []
    for (let i = 0; i < leadingPad; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    for (let i = 0; i < trailingPad; i++) cells.push(null)
    const out: Array<Array<number | null>> = []
    for (let i = 0; i < cells.length; i += 7) out.push(cells.slice(i, i + 7))
    return out
  }, [year, month, daysInMonth, weekStart])

  return (
    <Card>
      <CardTitle>日別 個別入力 (曜日別 % を継承、日ごとに上書き可能)</CardTitle>
      <ToggleSection>
        <ChipGroup>
          <Chip $active={weekStart === 0} onClick={() => onWeekStartChange(0)}>
            日曜始まり
          </Chip>
          <Chip $active={weekStart === 1} onClick={() => onWeekStartChange(1)}>
            月曜始まり
          </Chip>
          <Chip $active={false} onClick={onResetAll}>
            全日リセット
          </Chip>
        </ChipGroup>
      </ToggleSection>

      <DayCalendarGrid>
        {headerLabels.map((label) => (
          <DayCalendarHeaderCell key={`h-${label}`}>{label}</DayCalendarHeaderCell>
        ))}
        <DayCalendarHeaderCell>週合計</DayCalendarHeaderCell>

        {rows.map((rowCells, rowIdx) => (
          <WeekRowSlots
            key={`r-${rowIdx}`}
            weekIndex={rowIdx + 1}
            cells={rowCells}
            scenario={scenario}
            currentDay={currentDay}
            dowInputs={dowInputs}
            dowBase={dowBase}
            dayOverrides={dayOverrides}
            fmtCurrency={fmtCurrency}
            onOverrideChange={onOverrideChange}
            onOverrideClear={onOverrideClear}
          />
        ))}

        <DowAverageRow
          scenario={scenario}
          currentDay={currentDay}
          weekStart={weekStart}
          fmtCurrency={fmtCurrency}
        />
      </DayCalendarGrid>
    </Card>
  )
}

interface WeekRowProps {
  readonly weekIndex: number
  readonly cells: ReadonlyArray<number | null>
  readonly scenario: SimulatorScenario
  readonly currentDay: number
  readonly dowInputs: DowFactors
  readonly dowBase: DowBase
  readonly dayOverrides: Readonly<Record<number, number>>
  readonly fmtCurrency: Fmt
  readonly onOverrideChange: (day: number, pct: number) => void
  readonly onOverrideClear: (day: number) => void
}

function WeekRowSlots({
  weekIndex,
  cells,
  scenario,
  currentDay,
  dowInputs,
  dowBase,
  dayOverrides,
  fmtCurrency,
  onOverrideChange,
  onOverrideClear,
}: WeekRowProps) {
  const { dailyBudget, lyDaily } = scenario
  let budgetSum = 0
  let lySum = 0
  let dayCount = 0
  for (const d of cells) {
    if (d == null) continue
    budgetSum += dailyBudget[d - 1] ?? 0
    lySum += lyDaily[d - 1] ?? 0
    dayCount++
  }
  const budgetVsLy = lySum > 0 ? (budgetSum / lySum) * 100 : null

  return (
    <>
      {cells.map((day, idx) => (
        <DayCellSlot
          key={`c-${weekIndex}-${idx}`}
          day={day}
          scenario={scenario}
          currentDay={currentDay}
          dowInputs={dowInputs}
          dowBase={dowBase}
          dayOverrides={dayOverrides}
          fmtCurrency={fmtCurrency}
          onOverrideChange={onOverrideChange}
          onOverrideClear={onOverrideClear}
        />
      ))}
      <WeekTotalCell>
        <WeekTotalLabel>
          <span>W{weekIndex}</span>
          <span className="cnt">{dayCount}日</span>
        </WeekTotalLabel>
        <WeekTotalValue>予算 ¥{fmtCurrency(budgetSum)}</WeekTotalValue>
        <WeekTotalSub>前年 ¥{fmtCurrency(lySum)}</WeekTotalSub>
        <WeekTotalRatio
          $good={budgetVsLy != null && budgetVsLy >= 100}
          $bad={budgetVsLy != null && budgetVsLy < 100}
        >
          <span>予算/前年</span>
          <span>{budgetVsLy != null ? `${budgetVsLy.toFixed(0)}%` : '—'}</span>
        </WeekTotalRatio>
      </WeekTotalCell>
    </>
  )
}
