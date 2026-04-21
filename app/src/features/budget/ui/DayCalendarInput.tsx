/**
 * DayCalendarInput — 日別カレンダー形式の override 入力
 *
 * 曜日別係数を基準として、残期間の各日に対して個別の % を上書きできる。
 * dow モード時のみ表示される想定。過去日 (currentDay 以前) は読み取り専用。
 *
 * プロトタイプ App.jsx の DayCalendar コンポーネント相当。
 *
 * @responsibility R:form
 */
import type { DowBase, DowFactors } from '@/domain/calculations/budgetSimulator'
import { dowOf, pctForDay } from '@/domain/calculations/budgetSimulator'
import { Card, CardTitle } from '@/presentation/components/common/layout'
import { Chip, ChipGroup } from '@/presentation/components/common/forms'
import { ToggleSection } from '@/presentation/pages/Insight/InsightPage.styles'
import {
  DayCalendarGrid,
  DayCalendarHeaderCell,
  DayCalendarCell,
  DayCellHeader,
  DayCellNumber,
  DayCellPct,
  DayCellInput,
  DayCellResetBtn,
  DayCellPastMarker,
} from './BudgetSimulatorWidget.styles'

const DOW_LABELS_SUN_FIRST = ['日', '月', '火', '水', '木', '金', '土'] as const
const DOW_LABELS_MON_FIRST = ['月', '火', '水', '木', '金', '土', '日'] as const

interface Props {
  readonly year: number
  readonly month: number
  readonly daysInMonth: number
  readonly currentDay: number
  readonly dowInputs: DowFactors
  readonly dowBase: DowBase
  readonly dayOverrides: Readonly<Record<number, number>>
  readonly weekStart: 0 | 1
  readonly onWeekStartChange: (s: 0 | 1) => void
  readonly onOverrideChange: (day: number, pct: number) => void
  readonly onOverrideClear: (day: number) => void
  readonly onResetAll: () => void
}

export function DayCalendarInput(props: Props) {
  const {
    year,
    month,
    daysInMonth,
    currentDay,
    dowInputs,
    dayOverrides,
    weekStart,
    onWeekStartChange,
    onOverrideChange,
    onOverrideClear,
    onResetAll,
  } = props

  const headerLabels = weekStart === 0 ? DOW_LABELS_SUN_FIRST : DOW_LABELS_MON_FIRST

  // 月初の曜日から leading padding を計算
  const firstDow = dowOf(year, month, 1)
  const leadingPad = (firstDow - weekStart + 7) % 7

  const totalCells = leadingPad + daysInMonth
  const trailingPad = (7 - (totalCells % 7)) % 7
  const cells: Array<number | null> = []
  for (let i = 0; i < leadingPad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  for (let i = 0; i < trailingPad; i++) cells.push(null)

  return (
    <Card>
      <CardTitle>日別 override (曜日別の例外値)</CardTitle>
      <ToggleSection>
        <ChipGroup>
          <Chip $active={weekStart === 0} onClick={() => onWeekStartChange(0)}>
            日曜始まり
          </Chip>
          <Chip $active={weekStart === 1} onClick={() => onWeekStartChange(1)}>
            月曜始まり
          </Chip>
          <Chip $active={false} onClick={onResetAll}>
            全 override をリセット
          </Chip>
        </ChipGroup>
      </ToggleSection>

      <DayCalendarGrid>
        {headerLabels.map((label) => (
          <DayCalendarHeaderCell key={`h-${label}`}>{label}</DayCalendarHeaderCell>
        ))}
        {cells.map((day, idx) => (
          <DayCellSlot
            key={`c-${idx}`}
            day={day}
            year={year}
            month={month}
            currentDay={currentDay}
            dowInputs={dowInputs}
            dayOverrides={dayOverrides}
            onOverrideChange={onOverrideChange}
            onOverrideClear={onOverrideClear}
          />
        ))}
      </DayCalendarGrid>
    </Card>
  )
}

interface DayCellSlotProps {
  readonly day: number | null
  readonly year: number
  readonly month: number
  readonly currentDay: number
  readonly dowInputs: DowFactors
  readonly dayOverrides: Readonly<Record<number, number>>
  readonly onOverrideChange: (day: number, pct: number) => void
  readonly onOverrideClear: (day: number) => void
}

function DayCellSlot({
  day,
  year,
  month,
  currentDay,
  dowInputs,
  dayOverrides,
  onOverrideChange,
  onOverrideClear,
}: DayCellSlotProps) {
  if (day == null) {
    return <DayCalendarCell $empty />
  }

  const isPast = day <= currentDay
  const overridden = dayOverrides[day] != null
  const effectivePct = pctForDay(day, dayOverrides, dowInputs, year, month)

  return (
    <DayCalendarCell $past={isPast} $overridden={overridden}>
      <DayCellHeader>
        <DayCellNumber>{day}</DayCellNumber>
        {isPast ? (
          <DayCellPastMarker>経過</DayCellPastMarker>
        ) : (
          <DayCellPct>{effectivePct.toFixed(0)}%</DayCellPct>
        )}
      </DayCellHeader>
      {!isPast && (
        <>
          <DayCellInput
            type="number"
            min={0}
            step={1}
            value={overridden ? dayOverrides[day] : ''}
            placeholder={`${effectivePct.toFixed(0)}`}
            onChange={(e) => {
              const v = e.target.value
              if (v === '') {
                onOverrideClear(day)
              } else {
                onOverrideChange(day, Number(v))
              }
            }}
            aria-label={`${day}日の%`}
          />
          {overridden && (
            <DayCellResetBtn type="button" onClick={() => onOverrideClear(day)}>
              ×
            </DayCellResetBtn>
          )}
        </>
      )}
    </DayCalendarCell>
  )
}
