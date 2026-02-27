/**
 * DuckDB 日付範囲ピッカー
 *
 * DuckDB クエリ用の自由日付範囲を選択するコンパクトなUI。
 * HTML5 date input を使用し、月跨ぎの任意期間を指定できる。
 *
 * クイックプリセット:
 * - 当月: 現在の targetYear/targetMonth の全日
 * - 過去3ヶ月: 当月含む直近3ヶ月
 * - 過去6ヶ月: 当月含む直近6ヶ月
 * - 全期間: DuckDB にロードされた全データ範囲
 */
import { useState, useCallback, useMemo } from 'react'
import styled from 'styled-components'
import type { DateRange, CalendarDate } from '@/domain/models'
import { toDateKey, fromDateKey, dateRangeDays } from '@/domain/models'

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  font-size: 0.65rem;
`

const Label = styled.span`
  color: ${({ theme }) => theme.colors.text3};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  white-space: nowrap;
`

const DateInput = styled.input`
  padding: 2px 6px;
  font-size: 0.65rem;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  background: ${({ theme }) => theme.colors.bg};
  color: ${({ theme }) => theme.colors.text2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }

  &::-webkit-calendar-picker-indicator {
    opacity: 0.6;
    cursor: pointer;
    filter: ${({ theme }) => (theme.mode === 'dark' ? 'invert(1)' : 'none')};
  }
`

const Separator = styled.span`
  color: ${({ theme }) => theme.colors.text4};
`

const PresetButton = styled.button<{ $active: boolean }>`
  padding: 2px 8px;
  font-size: 0.6rem;
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.2)'
        : 'rgba(99,102,241,0.08)'
      : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text3)};
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

const DaysInfo = styled.span`
  color: ${({ theme }) => theme.colors.text4};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  white-space: nowrap;
`

type PresetKey = 'month' | '3m' | '6m' | 'all'

interface Props {
  readonly value: DateRange
  readonly onChange: (range: DateRange) => void
  readonly year: number
  readonly month: number
  readonly daysInMonth: number
  readonly loadedMonthCount: number
}

/**
 * 指定月数前の月初日を算出する
 */
function monthsAgo(year: number, month: number, count: number): CalendarDate {
  let y = year
  let m = month - count + 1 // +1 for inclusive current month
  while (m <= 0) {
    m += 12
    y -= 1
  }
  return { year: y, month: m, day: 1 }
}

export function DuckDBDateRangePicker({
  value,
  onChange,
  year,
  month,
  daysInMonth,
  loadedMonthCount,
}: Props) {
  const fromStr = toDateKey(value.from)
  const toStr = toDateKey(value.to)
  const days = dateRangeDays(value)

  // プリセット範囲の算出
  const presets = useMemo(() => {
    const monthEnd = { year, month, day: daysInMonth }

    const monthRange: DateRange = {
      from: { year, month, day: 1 },
      to: monthEnd,
    }

    const threeMonthStart = monthsAgo(year, month, 3)
    const threeMonthRange: DateRange = {
      from: threeMonthStart,
      to: monthEnd,
    }

    const sixMonthStart = monthsAgo(year, month, 6)
    const sixMonthRange: DateRange = {
      from: sixMonthStart,
      to: monthEnd,
    }

    // 全期間 = ロード済み月数に基づく推定
    const allStart = monthsAgo(year, month, loadedMonthCount)
    const allRange: DateRange = {
      from: allStart,
      to: monthEnd,
    }

    return { month: monthRange, '3m': threeMonthRange, '6m': sixMonthRange, all: allRange }
  }, [year, month, daysInMonth, loadedMonthCount])

  // アクティブなプリセットを判定
  const activePreset = useMemo((): PresetKey | null => {
    const f = toDateKey(value.from)
    const t = toDateKey(value.to)
    if (f === toDateKey(presets.month.from) && t === toDateKey(presets.month.to)) return 'month'
    if (f === toDateKey(presets['3m'].from) && t === toDateKey(presets['3m'].to)) return '3m'
    if (f === toDateKey(presets['6m'].from) && t === toDateKey(presets['6m'].to)) return '6m'
    if (f === toDateKey(presets.all.from) && t === toDateKey(presets.all.to)) return 'all'
    return null
  }, [value, presets])

  const handleFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const key = e.target.value
      if (!key) return
      const from = fromDateKey(key)
      onChange({ from, to: value.to })
    },
    [value.to, onChange],
  )

  const handleToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const key = e.target.value
      if (!key) return
      const to = fromDateKey(key)
      onChange({ from: value.from, to })
    },
    [value.from, onChange],
  )

  const handlePreset = useCallback(
    (preset: PresetKey) => {
      onChange(presets[preset])
    },
    [presets, onChange],
  )

  return (
    <Wrapper>
      <Label>DuckDB 分析期間:</Label>
      <DateInput type="date" value={fromStr} onChange={handleFromChange} />
      <Separator>〜</Separator>
      <DateInput type="date" value={toStr} onChange={handleToChange} />
      <DaysInfo>({days}日間)</DaysInfo>

      <PresetButton $active={activePreset === 'month'} onClick={() => handlePreset('month')}>
        当月
      </PresetButton>
      {loadedMonthCount >= 3 && (
        <PresetButton $active={activePreset === '3m'} onClick={() => handlePreset('3m')}>
          過去3ヶ月
        </PresetButton>
      )}
      {loadedMonthCount >= 6 && (
        <PresetButton $active={activePreset === '6m'} onClick={() => handlePreset('6m')}>
          過去6ヶ月
        </PresetButton>
      )}
      {loadedMonthCount >= 2 && (
        <PresetButton $active={activePreset === 'all'} onClick={() => handlePreset('all')}>
          全期間
        </PresetButton>
      )}
    </Wrapper>
  )
}

/**
 * DuckDB 分析用日付範囲を管理するフック。
 *
 * デフォルトは当月全日。ユーザーが自由に変更できる。
 * year/month が変わったら当月全日にリセットする。
 */
export function useDuckDBDateRange(
  year: number,
  month: number,
  daysInMonth: number,
): [DateRange, (range: DateRange) => void] {
  // year/month をキーとして追跡し、変更時にリセット
  const [trackedKey, setTrackedKey] = useState(`${year}-${month}`)

  const defaultRange = useMemo<DateRange>(
    () => ({ from: { year, month, day: 1 }, to: { year, month, day: daysInMonth } }),
    [year, month, daysInMonth],
  )

  const [range, setRange] = useState<DateRange>(defaultRange)

  const yearMonthKey = `${year}-${month}`
  if (yearMonthKey !== trackedKey) {
    setTrackedKey(yearMonthKey)
    setRange(defaultRange)
  }

  const handleChange = useCallback((newRange: DateRange) => {
    setRange(newRange)
  }, [])

  return [range, handleChange]
}
