/**
 * DayCalendarInput — 日別カレンダー形式の override 入力
 *
 * 仕様書 §07 モード3 カレンダー個別入力 に準拠:
 * - 過去セル (≤ currentDay): 実績額 + 予算達成率 + 前年比 を read-only 表示
 * - 未来セル (> currentDay): % 入力 + ¥ 入力 (相互変換)
 * - dayOverrides は曜日別 % より優先
 * - 全日リセット / 週始まり切替あり
 *
 * @responsibility R:form
 */
import { useMemo } from 'react'
import type { DowBase, DowFactors, SimulatorScenario } from '@/domain/calculations/budgetSimulator'
import { dowOf, pctForDay } from '@/domain/calculations/budgetSimulator'
import { Card, CardTitle } from '@/presentation/components/common/layout'
import { Chip, ChipGroup } from '@/presentation/components/common/forms'
import { ToggleSection } from '@/presentation/pages/Insight/InsightPage.styles'
import type { UnifiedWidgetContext } from '@/presentation/components/widgets'
import {
  DayCalendarCell,
  DayCalendarGrid,
  DayCalendarHeaderCell,
  DayCellHeader,
  DayCellInput,
  DayCellNumber,
  DayCellPct,
  DayCellResetBtn,
} from './BudgetSimulatorWidget.styles'

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

  const layout = useMemo(() => {
    const firstDow = dowOf(year, month, 1)
    const leadingPad = (firstDow - weekStart + 7) % 7
    const totalCells = leadingPad + daysInMonth
    const trailingPad = (7 - (totalCells % 7)) % 7
    const cells: Array<number | null> = []
    for (let i = 0; i < leadingPad; i++) cells.push(null)
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    for (let i = 0; i < trailingPad; i++) cells.push(null)
    return cells
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
        {layout.map((day, idx) => (
          <DayCellSlot
            key={`c-${idx}`}
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
      </DayCalendarGrid>
    </Card>
  )
}

interface SlotProps {
  readonly day: number | null
  readonly scenario: SimulatorScenario
  readonly currentDay: number
  readonly dowInputs: DowFactors
  readonly dowBase: DowBase
  readonly dayOverrides: Readonly<Record<number, number>>
  readonly fmtCurrency: Fmt
  readonly onOverrideChange: (day: number, pct: number) => void
  readonly onOverrideClear: (day: number) => void
}

function DayCellSlot({
  day,
  scenario,
  currentDay,
  dowInputs,
  dowBase,
  dayOverrides,
  fmtCurrency,
  onOverrideChange,
  onOverrideClear,
}: SlotProps) {
  if (day == null) return <DayCalendarCell $empty />

  const { year, month, dailyBudget, lyDaily, actualDaily } = scenario
  const isPast = day <= currentDay
  const overridden = dayOverrides[day] != null

  if (isPast) {
    // 過去セル: 実績額 + 予算達成率 + 前年比 を read-only 表示
    const actual = actualDaily[day - 1] ?? 0
    const budget = dailyBudget[day - 1] ?? 0
    const ly = lyDaily[day - 1] ?? 0
    const achievement = budget > 0 ? (actual / budget) * 100 : null
    const yoy = ly > 0 ? (actual / ly) * 100 : null
    return (
      <DayCalendarCell $past>
        <DayCellHeader>
          <DayCellNumber>{day}</DayCellNumber>
        </DayCellHeader>
        <div style={{ fontSize: '0.72rem', fontWeight: 600 }}>¥{fmtCurrency(actual)}</div>
        {achievement != null && (
          <div
            style={{
              fontSize: '0.65rem',
              color: achievement >= 100 ? 'var(--positive, #0ea5e9)' : 'var(--negative, #f97316)',
            }}
          >
            達成率 {achievement.toFixed(0)}%
          </div>
        )}
        {yoy != null && (
          <div
            style={{
              fontSize: '0.65rem',
              color: yoy >= 100 ? 'var(--positive, #0ea5e9)' : 'var(--negative, #f97316)',
            }}
          >
            前年比 {yoy.toFixed(0)}%
          </div>
        )}
      </DayCalendarCell>
    )
  }

  // 未来セル: % 入力 + ¥ 入力 (相互変換)
  const baseSeries = dowBase === 'yoy' ? lyDaily : dailyBudget
  const baseAmt = baseSeries[day - 1] ?? 0
  const effectivePct = pctForDay(day, dayOverrides, dowInputs, year, month)
  const projectedAmt = baseAmt * (effectivePct / 100)
  const overrideVal = dayOverrides[day]

  const onPctChange = (raw: string) => {
    if (raw === '') {
      onOverrideClear(day)
    } else {
      const n = Number(raw)
      if (Number.isFinite(n)) onOverrideChange(day, n)
    }
  }

  const onYenChange = (raw: string) => {
    if (raw === '') {
      onOverrideClear(day)
      return
    }
    const yen = Number(raw)
    if (!Number.isFinite(yen) || baseAmt <= 0) return
    // 相互変換: ¥ → % = (yen / baseAmt) × 100
    const pct = (yen / baseAmt) * 100
    onOverrideChange(day, Math.round(pct * 10) / 10)
  }

  return (
    <DayCalendarCell $overridden={overridden}>
      <DayCellHeader>
        <DayCellNumber>{day}</DayCellNumber>
        <DayCellPct>{effectivePct.toFixed(0)}%</DayCellPct>
      </DayCellHeader>
      <DayCellInput
        type="number"
        min={0}
        max={300}
        step={0.1}
        value={overrideVal ?? ''}
        placeholder={`${effectivePct.toFixed(0)}%`}
        onChange={(e) => onPctChange(e.target.value)}
        aria-label={`${day}日の%`}
      />
      <DayCellInput
        type="number"
        min={0}
        step={1000}
        value={overrideVal != null ? Math.round(projectedAmt) : ''}
        placeholder={`¥${fmtCurrency(projectedAmt)}`}
        onChange={(e) => onYenChange(e.target.value)}
        aria-label={`${day}日の金額`}
        style={{ fontSize: '0.72rem' }}
      />
      {overridden && (
        <DayCellResetBtn type="button" onClick={() => onOverrideClear(day)}>
          × リセット
        </DayCellResetBtn>
      )}
    </DayCalendarCell>
  )
}
