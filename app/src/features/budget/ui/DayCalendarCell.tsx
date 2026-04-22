/**
 * DayCalendarCell — 日別カレンダーの 1 セル
 *
 * 過去セル: 実績 + 達成率 + 前年比 (read-only)
 * 未来セル: % / ¥ 入力 + 予測達成率 + 予測前年比 (書込み可)
 *
 * @responsibility R:form
 */
import type { DowBase, DowFactors, SimulatorScenario } from '@/domain/calculations/budgetSimulator'
import { pctForDay } from '@/domain/calculations/budgetSimulator'
import type { UnifiedWidgetContext } from '@/presentation/components/widgets'
import {
  DayCalendarCell as DayCell,
  DayCellHeader,
  DayCellInput,
  DayCellNumber,
  DayCellPct,
  DayCellRatios,
  DayCellResetBtn,
} from './BudgetSimulatorWidget.styles'

type Fmt = UnifiedWidgetContext['fmtCurrency']

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

function ratioClass(v: number | null): string {
  if (v == null) return 'dim'
  return v >= 100 ? 'good' : 'bad'
}

export function DayCellSlot({
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
  if (day == null) return <DayCell $empty />

  const { year, month, dailyBudget, lyDaily, actualDaily } = scenario
  const isPast = day <= currentDay
  const overridden = dayOverrides[day] != null

  if (isPast) {
    const actual = actualDaily[day - 1] ?? 0
    const budget = dailyBudget[day - 1] ?? 0
    const ly = lyDaily[day - 1] ?? 0
    const achievement = budget > 0 ? (actual / budget) * 100 : null
    const yoy = ly > 0 ? (actual / ly) * 100 : null
    return (
      <DayCell $past>
        <DayCellHeader>
          <DayCellNumber>{day}</DayCellNumber>
        </DayCellHeader>
        <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>¥{fmtCurrency(actual)}</div>
        <DayCellRatios>
          <span className={ratioClass(achievement)}>
            達成 {achievement != null ? `${achievement.toFixed(0)}%` : '—'}
          </span>
          <span className={ratioClass(yoy)}>前年 {yoy != null ? `${yoy.toFixed(0)}%` : '—'}</span>
        </DayCellRatios>
      </DayCell>
    )
  }

  const baseSeries = dowBase === 'yoy' ? lyDaily : dailyBudget
  const baseAmt = baseSeries[day - 1] ?? 0
  const effectivePct = pctForDay(day, dayOverrides, dowInputs, year, month)
  const projectedAmt = baseAmt * (effectivePct / 100)
  const budget = dailyBudget[day - 1] ?? 0
  const ly = lyDaily[day - 1] ?? 0
  const projAch = budget > 0 ? (projectedAmt / budget) * 100 : null
  const projYoy = ly > 0 ? (projectedAmt / ly) * 100 : null
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
    const pct = (yen / baseAmt) * 100
    onOverrideChange(day, Math.round(pct * 10) / 10)
  }

  return (
    <DayCell $overridden={overridden}>
      <DayCellHeader>
        <DayCellNumber>{day}</DayCellNumber>
        <DayCellPct>{effectivePct.toFixed(1)}%</DayCellPct>
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
      <DayCellRatios>
        <span className={ratioClass(projAch)}>
          達成 {projAch != null ? `${projAch.toFixed(0)}%` : '—'}
        </span>
        <span className={ratioClass(projYoy)}>
          前年 {projYoy != null ? `${projYoy.toFixed(0)}%` : '—'}
        </span>
      </DayCellRatios>
      {overridden && (
        <DayCellResetBtn type="button" onClick={() => onOverrideClear(day)}>
          × リセット
        </DayCellResetBtn>
      )}
    </DayCell>
  )
}
