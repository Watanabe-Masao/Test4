import { useState, useMemo, useCallback } from 'react'
import styled from 'styled-components'
import type { CategoryTimeSalesRecord } from '@/domain/models'

/* ── Types ──────────────────────────────────────────────── */

export type AggregateMode = 'total' | 'dailyAvg' | 'dowAvg'

export interface PeriodFilterState {
  /** 対象日範囲 [from, to] */
  dayRange: [number, number]
  /** 集計モード: total=期間合計, dailyAvg=期間内日平均, dowAvg=曜日別平均 */
  mode: AggregateMode
}

export interface PeriodFilterResult extends PeriodFilterState {
  setDayRange: (range: [number, number]) => void
  setMode: (mode: AggregateMode) => void
  /** 期間でフィルタ済みレコード */
  filterRecords: (records: readonly CategoryTimeSalesRecord[]) => readonly CategoryTimeSalesRecord[]
  /** 集計係数（dailyAvg の場合 1/日数） */
  divisor: number
  /** year/month (曜日計算用) */
  year: number
  month: number
}

/* ── Hook ───────────────────────────────────────────────── */

export function usePeriodFilter(daysInMonth: number, year: number, month: number): PeriodFilterResult {
  const [dayRange, setDayRange] = useState<[number, number]>([1, daysInMonth])
  const [mode, setMode] = useState<AggregateMode>('total')

  const filterRecords = useCallback(
    (records: readonly CategoryTimeSalesRecord[]) =>
      records.filter((r) => r.day >= dayRange[0] && r.day <= dayRange[1]),
    [dayRange],
  )

  const divisor = useMemo(() => {
    if (mode === 'total') return 1
    if (mode === 'dailyAvg') {
      const span = dayRange[1] - dayRange[0] + 1
      return span > 0 ? span : 1
    }
    // dowAvg: 曜日別に割る → 各曜日の出現回数で割る必要があるので widget 側で処理
    return 1
  }, [mode, dayRange])

  return { dayRange, setDayRange, mode, setMode, filterRecords, divisor, year, month }
}

/* ── Styled ─────────────────────────────────────────────── */

const Bar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => `${theme.spacing[2]} ${theme.spacing[4]}`};
  flex-wrap: wrap;
`

const Label = styled.span`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
  white-space: nowrap;
`

const RangeValue = styled.span`
  font-size: 0.65rem;
  font-weight: 600;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text2};
  min-width: 80px;
  text-align: center;
`

const SliderInput = styled.input`
  flex: 1;
  min-width: 80px;
  -webkit-appearance: none;
  appearance: none;
  height: 4px;
  border-radius: 2px;
  background: ${({ theme }) => theme.colors.border};
  outline: none;
  cursor: pointer;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.palette.primary};
    border: 2px solid ${({ theme }) => theme.colors.bg2};
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    cursor: pointer;
  }
  &::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.palette.primary};
    border: 2px solid ${({ theme }) => theme.colors.bg2};
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    cursor: pointer;
  }
`

const TabGroup = styled.div`
  display: flex;
  gap: 2px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: 2px;
`

const Tab = styled.button<{ $active: boolean }>`
  all: unset;
  cursor: pointer;
  font-size: 0.6rem;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $active, theme }) => ($active ? '#fff' : theme.colors.text3)};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.palette.primary : 'transparent'};
  transition: all 0.15s;
  white-space: nowrap;
  &:hover {
    opacity: 0.85;
  }
`

const Sep = styled.span`
  width: 1px;
  height: 14px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'};
`

/* ── Component ──────────────────────────────────────────── */

interface PeriodFilterBarProps {
  pf: PeriodFilterResult
  daysInMonth: number
}

const MODE_LABELS: Record<AggregateMode, string> = {
  total: '期間合計',
  dailyAvg: '日平均',
  dowAvg: '曜日別平均',
}

export function PeriodFilterBar({ pf, daysInMonth }: PeriodFilterBarProps) {
  const isFullRange = pf.dayRange[0] === 1 && pf.dayRange[1] === daysInMonth

  return (
    <Bar>
      <Label>期間</Label>
      <SliderInput
        type="range"
        min={1}
        max={daysInMonth}
        value={pf.dayRange[0]}
        onChange={(e) => {
          const v = Number(e.target.value)
          pf.setDayRange([Math.min(v, pf.dayRange[1]), pf.dayRange[1]])
        }}
      />
      <RangeValue>{pf.dayRange[0]}日 〜 {pf.dayRange[1]}日</RangeValue>
      <SliderInput
        type="range"
        min={1}
        max={daysInMonth}
        value={pf.dayRange[1]}
        onChange={(e) => {
          const v = Number(e.target.value)
          pf.setDayRange([pf.dayRange[0], Math.max(v, pf.dayRange[0])])
        }}
      />
      {!isFullRange && (
        <Tab
          $active={false}
          onClick={() => pf.setDayRange([1, daysInMonth])}
          style={{ fontSize: '0.55rem' }}
        >
          全期間
        </Tab>
      )}
      <Sep />
      <TabGroup>
        {(['total', 'dailyAvg', 'dowAvg'] as AggregateMode[]).map((m) => (
          <Tab key={m} $active={pf.mode === m} onClick={() => pf.setMode(m)}>
            {MODE_LABELS[m]}
          </Tab>
        ))}
      </TabGroup>
    </Bar>
  )
}

/* ── Utility: 曜日カウント計算 ─────────────────────────── */

/** dayRange 内で各曜日(0=日〜6=土)が何日あるか返す */
export function countDowInRange(
  year: number,
  month: number,
  from: number,
  to: number,
): Map<number, number> {
  const counts = new Map<number, number>()
  for (let d = from; d <= to; d++) {
    const dow = new Date(year, month - 1, d).getDay()
    counts.set(dow, (counts.get(dow) ?? 0) + 1)
  }
  return counts
}
