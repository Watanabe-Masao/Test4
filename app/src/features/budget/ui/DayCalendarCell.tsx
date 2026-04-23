/**
 * DayCalendarCell — 日別カレンダーの 1 セル
 *
 * 過去セル (read-only):
 *   [日] 前年 ¥A / 予算 ¥B / 実績 ¥C / 予算比 X% / 前年比 Y%
 *
 * 未来セル (書込み可):
 *   [日] 前年 ¥A / 予算 ¥B / 実績 ¥[入力] / {予算比|前年比} [入力] ({} は dowBase で切替)
 *
 * 実績¥ と 比率% は連動する (どちらを編集しても `dayOverrides[day]` = 基準系列に対する%)。
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

function ratioColor(v: number | null, theme: 'good' | 'bad' | 'neutral' = 'neutral'): string {
  if (v == null) return 'var(--text3, #9ca3af)'
  if (theme !== 'neutral') return theme === 'good' ? 'var(--pos, #10b981)' : 'var(--neg, #ef4444)'
  return v >= 100 ? 'var(--pos, #10b981)' : 'var(--neg, #ef4444)'
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  fontSize: '0.7rem',
  fontVariantNumeric: 'tabular-nums',
  lineHeight: 1.3,
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
  const budget = dailyBudget[day - 1] ?? 0
  const ly = lyDaily[day - 1] ?? 0

  if (isPast) {
    const actual = actualDaily[day - 1] ?? 0
    const achievement = budget > 0 ? (actual / budget) * 100 : null
    const yoy = ly > 0 ? (actual / ly) * 100 : null
    return (
      <DayCell $past>
        <DayCellHeader>
          <DayCellNumber>{day}</DayCellNumber>
        </DayCellHeader>
        <div style={rowStyle}>
          <span>前年</span>
          <span>¥{fmtCurrency(ly)}</span>
        </div>
        <div style={rowStyle}>
          <span>予算</span>
          <span>¥{fmtCurrency(budget)}</span>
        </div>
        <div style={{ ...rowStyle, fontWeight: 600 }}>
          <span>実績</span>
          <span>¥{fmtCurrency(actual)}</span>
        </div>
        <div
          style={{
            ...rowStyle,
            color: ratioColor(achievement),
          }}
        >
          <span>予算比</span>
          <span>{achievement != null ? `${achievement.toFixed(0)}%` : '—'}</span>
        </div>
        <div style={{ ...rowStyle, color: ratioColor(yoy) }}>
          <span>前年比</span>
          <span>{yoy != null ? `${yoy.toFixed(0)}%` : '—'}</span>
        </div>
      </DayCell>
    )
  }

  // 未来セル: 実績 ¥ + 比率 % を連動入力
  const baseSeries = dowBase === 'yoy' ? lyDaily : dailyBudget
  const baseAmt = baseSeries[day - 1] ?? 0
  const effectivePct = pctForDay(day, dayOverrides, dowInputs, year, month)
  const projectedAmt = baseAmt * (effectivePct / 100)
  const projAch = budget > 0 ? (projectedAmt / budget) * 100 : null
  const projYoy = ly > 0 ? (projectedAmt / ly) * 100 : null
  const overrideVal = dayOverrides[day]

  const onPctChange = (raw: string) => {
    if (raw === '') {
      onOverrideClear(day)
      return
    }
    const n = Number(raw)
    if (Number.isFinite(n)) onOverrideChange(day, n)
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

  const ratioLabel = dowBase === 'yoy' ? '前年比' : '予算比'
  const displayPct = overrideVal ?? ''

  return (
    <DayCell $overridden={overridden}>
      <DayCellHeader>
        <DayCellNumber>{day}</DayCellNumber>
        <DayCellPct>{effectivePct.toFixed(1)}%</DayCellPct>
      </DayCellHeader>
      <div style={rowStyle}>
        <span>前年</span>
        <span>¥{fmtCurrency(ly)}</span>
      </div>
      <div style={rowStyle}>
        <span>予算</span>
        <span>¥{fmtCurrency(budget)}</span>
      </div>
      <div style={{ ...rowStyle, alignItems: 'center', gap: 4 }}>
        <span>実績</span>
        <DayCellInput
          type="number"
          min={0}
          step={1000}
          value={overrideVal != null ? Math.round(projectedAmt) : ''}
          placeholder={`¥${fmtCurrency(projectedAmt)}`}
          onChange={(e) => onYenChange(e.target.value)}
          aria-label={`${day}日の実績額`}
          style={{ flex: '1 1 auto', textAlign: 'right', fontSize: '0.7rem' }}
        />
      </div>
      <div style={{ ...rowStyle, alignItems: 'center', gap: 4 }}>
        <span>{ratioLabel}</span>
        <DayCellInput
          type="number"
          min={0}
          max={300}
          step={0.1}
          value={displayPct}
          placeholder={`${effectivePct.toFixed(0)}%`}
          onChange={(e) => onPctChange(e.target.value)}
          aria-label={`${day}日の${ratioLabel}`}
          style={{ flex: '1 1 auto', textAlign: 'right', fontSize: '0.7rem' }}
        />
      </div>
      <div
        style={{
          ...rowStyle,
          color: ratioColor(dowBase === 'yoy' ? projAch : projYoy),
          fontSize: '0.65rem',
        }}
      >
        <span>{dowBase === 'yoy' ? '予算比' : '前年比'}</span>
        <span>
          {dowBase === 'yoy'
            ? projAch != null
              ? `${projAch.toFixed(0)}%`
              : '—'
            : projYoy != null
              ? `${projYoy.toFixed(0)}%`
              : '—'}
        </span>
      </div>
      {overridden && (
        <DayCellResetBtn type="button" onClick={() => onOverrideClear(day)}>
          × リセット
        </DayCellResetBtn>
      )}
    </DayCell>
  )
}
