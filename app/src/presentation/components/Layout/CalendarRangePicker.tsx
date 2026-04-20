/**
 * CalendarRangePicker — react-day-picker ベースの日付範囲ピッカー
 *
 * 期間-1（分析期間）と期間-2（比較期間）の両方で使用する汎用コンポーネント。
 * react-day-picker の range モードで開始日・終了日をクリック選択し、
 * 2ヶ月並列表示で月跨ぎの期間指定を直感的に行える。
 *
 * d3 i-Comp のように:
 * - 期間-1: 2026/03/01 〜 2026/03/07
 * - 期間-2: 2025/03/02 〜 2025/03/08
 * を自由に指定し、全チャート・計算がその範囲でトリミングされる。
 * @responsibility R:layout
 */
import { useCallback, useMemo } from 'react'
import { DayPicker } from 'react-day-picker'
import { ja } from 'date-fns/locale'
import type { DateRange as AppDateRange } from '@/domain/models/calendar'
import { dateRangeDays, toDateKey } from '@/domain/models/calendar'
import type { DateRange as RdpDateRange } from 'react-day-picker'
import {
  CalendarDropdown,
  CalendarLabel,
  PresetRow,
  PresetChip,
  RangeInfo,
  DayPickerWrapper,
} from './CalendarRangePicker.styles'

// ── CalendarDate ↔ Date 変換 / Preset 定義（DualPeriodPicker と共通） ──

import {
  toJsDate,
  fromJsDate,
  buildP1Presets as buildPresets,
  type P1Preset as Preset,
} from './DualPeriodPicker.helpers'

// ── Props ──

interface CalendarRangePickerProps {
  /** 現在選択中の日付範囲 */
  readonly value: AppDateRange
  /** 範囲変更コールバック */
  readonly onChange: (range: AppDateRange) => void
  /** 表示ラベル */
  readonly label: string
  /** 対象年（プリセット算出用） */
  readonly year: number
  /** 対象月（プリセット算出用） */
  readonly month: number
  /** 月の日数 */
  readonly daysInMonth: number
}

export function CalendarRangePicker({
  value,
  onChange,
  label,
  year,
  month,
  daysInMonth,
}: CalendarRangePickerProps) {
  // react-day-picker 用の DateRange に変換
  const selected: RdpDateRange = useMemo(
    () => ({
      from: toJsDate(value.from),
      to: toJsDate(value.to),
    }),
    [value],
  )

  // カレンダーの初期表示月
  const defaultMonth = useMemo(() => new Date(year, month - 1, 1), [year, month])

  // プリセット
  const presets = useMemo(() => buildPresets(year, month, daysInMonth), [year, month, daysInMonth])

  // アクティブプリセット判定
  const activePresetKey = useMemo(() => {
    const f = toDateKey(value.from)
    const t = toDateKey(value.to)
    return (
      presets.find((p) => toDateKey(p.range.from) === f && toDateKey(p.range.to) === t)?.key ?? null
    )
  }, [value, presets])

  // 日数
  const days = dateRangeDays(value)

  // range 選択ハンドラ
  const handleSelect = useCallback(
    (range: RdpDateRange | undefined) => {
      if (!range?.from) return
      if (!range.to) {
        // 開始日のみ選択された状態（終了日クリック待ち）
        const from = fromJsDate(range.from)
        onChange({ from, to: from })
        return
      }
      onChange({ from: fromJsDate(range.from), to: fromJsDate(range.to) })
    },
    [onChange],
  )

  // プリセット適用
  const handlePreset = useCallback(
    (preset: Preset) => {
      onChange(preset.range)
    },
    [onChange],
  )

  return (
    <CalendarDropdown>
      <CalendarLabel>{label}</CalendarLabel>

      <PresetRow>
        {presets.map((p) => (
          <PresetChip
            key={p.key}
            $active={activePresetKey === p.key}
            onClick={() => handlePreset(p)}
          >
            {p.label}
          </PresetChip>
        ))}
      </PresetRow>

      <DayPickerWrapper>
        <DayPicker
          mode="range"
          locale={ja}
          selected={selected}
          onSelect={handleSelect}
          defaultMonth={defaultMonth}
          numberOfMonths={2}
          showOutsideDays
          fixedWeeks
        />
      </DayPickerWrapper>

      <RangeInfo>
        {toDateKey(value.from)} 〜 {toDateKey(value.to)}（{days}日間）
      </RangeInfo>
    </CalendarDropdown>
  )
}
