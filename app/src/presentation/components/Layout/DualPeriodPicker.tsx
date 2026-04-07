/**
 * DualPeriodPicker — 期間1・期間2 を上下に分けた統合パネル
 *
 * 1つのパネルで期間1（分析期間）と期間2（比較期間）を明確に分離表示。
 * 選択中のセクションだけカレンダーを開き、もう一方は要約表示。
 *
 * ## UI構成
 *
 * ┌─────────────────────────────┐
 * │ 期間1（分析期間）          │ ← クリックで展開
 * │ 2026-03-01 〜 2026-03-31   │
 * │ [月全日] [上旬] [中旬] [下旬] │
 * │ ┌───────┐ ┌───────┐         │
 * │ │ 2月    │ │ 3月    │         │
 * │ └───────┘ └───────┘         │
 * ├─────────────────────────────┤
 * │ 期間2（比較期間）          │ ← クリックで展開
 * │ 2025-03-01 〜 2025-03-31   │
 * │ [前年同月] [前年同曜日] ... │
 * └─────────────────────────────┘
 * @responsibility R:layout
 */
import { useCallback, useMemo, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { ja } from 'date-fns/locale'
import type { DateRange as AppDateRange } from '@/domain/models/calendar'
import { dateRangeDays, toDateKey } from '@/domain/models/calendar'
import type { DateRange as RdpDateRange } from 'react-day-picker'
import type { ComparisonPreset } from '@/domain/models/PeriodSelection'
import {
  DualPeriodPanel,
  PeriodSection,
  SectionHeader,
  SectionTitle,
  SectionDateRange,
  SectionDays,
  PresetRow,
  PresetChip,
  DayPickerWrapper,
} from './CalendarRangePicker.styles'

// ── CalendarDate ↔ Date 変換 ──

function toJsDate(d: AppDateRange['from']): Date {
  return new Date(d.year, d.month - 1, d.day)
}

function fromJsDate(d: Date): AppDateRange['from'] {
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() }
}

// ── Period1 Presets ──

interface P1Preset {
  readonly label: string
  readonly key: string
  readonly range: AppDateRange
}

function buildP1Presets(year: number, month: number, daysInMonth: number): readonly P1Preset[] {
  const monthEnd = { year, month, day: daysInMonth }
  return [
    {
      label: '月全日',
      key: 'full',
      range: { from: { year, month, day: 1 }, to: monthEnd },
    },
    {
      label: '上旬',
      key: 'early',
      range: { from: { year, month, day: 1 }, to: { year, month, day: 10 } },
    },
    {
      label: '中旬',
      key: 'mid',
      range: { from: { year, month, day: 11 }, to: { year, month, day: 20 } },
    },
    {
      label: '下旬',
      key: 'late',
      range: { from: { year, month, day: 21 }, to: monthEnd },
    },
  ]
}

// ── Period2 Comparison Presets ──

const COMPARISON_PRESETS: readonly { key: ComparisonPreset; label: string }[] = [
  { key: 'prevYearSameMonth', label: '前年同月' },
  { key: 'prevYearSameDow', label: '前年同曜日' },
  { key: 'prevMonth', label: '前月' },
  { key: 'custom', label: '自由指定' },
]

// ── Props ──

interface DualPeriodPickerProps {
  readonly period1: AppDateRange
  readonly period2: AppDateRange
  readonly comparisonEnabled: boolean
  readonly activePreset: ComparisonPreset
  readonly onPeriod1Change: (range: AppDateRange) => void
  readonly onPeriod2Change: (range: AppDateRange) => void
  readonly onPresetChange: (preset: ComparisonPreset) => void
  readonly onComparisonToggle: (enabled: boolean) => void
  /** 対象年（プリセット算出用） */
  readonly year: number
  /** 対象月（プリセット算出用） */
  readonly month: number
  /** 月の日数 */
  readonly daysInMonth: number
}

type ActiveSection = 'period1' | 'period2'

export function DualPeriodPicker({
  period1,
  period2,
  comparisonEnabled,
  activePreset,
  onPeriod1Change,
  onPeriod2Change,
  onPresetChange,
  onComparisonToggle,
  year,
  month,
  daysInMonth,
}: DualPeriodPickerProps) {
  const [activeSection, setActiveSection] = useState<ActiveSection>('period1')

  // ── Period 1 ──

  const p1Selected: RdpDateRange = useMemo(
    () => ({ from: toJsDate(period1.from), to: toJsDate(period1.to) }),
    [period1],
  )
  const p1DefaultMonth = useMemo(() => new Date(year, month - 1, 1), [year, month])
  const p1Presets = useMemo(
    () => buildP1Presets(year, month, daysInMonth),
    [year, month, daysInMonth],
  )
  const p1ActivePresetKey = useMemo(() => {
    const f = toDateKey(period1.from)
    const t = toDateKey(period1.to)
    return (
      p1Presets.find((p) => toDateKey(p.range.from) === f && toDateKey(p.range.to) === t)?.key ??
      null
    )
  }, [period1, p1Presets])
  const p1Days = dateRangeDays(period1)

  const handleP1Select = useCallback(
    (range: RdpDateRange | undefined) => {
      if (!range?.from) return
      if (!range.to) {
        const from = fromJsDate(range.from)
        onPeriod1Change({ from, to: from })
        return
      }
      onPeriod1Change({ from: fromJsDate(range.from), to: fromJsDate(range.to) })
    },
    [onPeriod1Change],
  )

  // ── Period 2 ──

  const p2Selected: RdpDateRange = useMemo(
    () => ({ from: toJsDate(period2.from), to: toJsDate(period2.to) }),
    [period2],
  )
  const p2DefaultMonth = useMemo(
    () => new Date(period2.from.year, period2.from.month - 1, 1),
    [period2.from.year, period2.from.month],
  )
  const p2Days = dateRangeDays(period2)

  const handleP2Select = useCallback(
    (range: RdpDateRange | undefined) => {
      if (!range?.from) return
      if (!range.to) {
        const from = fromJsDate(range.from)
        onPeriod2Change({ from, to: from })
        return
      }
      onPeriod2Change({ from: fromJsDate(range.from), to: fromJsDate(range.to) })
    },
    [onPeriod2Change],
  )

  return (
    <DualPeriodPanel>
      {/* ── 期間1 ── */}
      <PeriodSection
        $active={activeSection === 'period1'}
        $color="#6366f1"
        onClick={() => setActiveSection('period1')}
      >
        <SectionHeader>
          <SectionTitle $color="#6366f1">期間1（分析期間）</SectionTitle>
          <div>
            <SectionDateRange>
              {toDateKey(period1.from)} 〜 {toDateKey(period1.to)}
            </SectionDateRange>
            <SectionDays>({p1Days}日間)</SectionDays>
          </div>
        </SectionHeader>

        {activeSection === 'period1' && (
          <>
            <PresetRow>
              {p1Presets.map((p) => (
                <PresetChip
                  key={p.key}
                  $active={p1ActivePresetKey === p.key}
                  onClick={(e) => {
                    e.stopPropagation()
                    onPeriod1Change(p.range)
                  }}
                >
                  {p.label}
                </PresetChip>
              ))}
            </PresetRow>
            <DayPickerWrapper onClick={(e) => e.stopPropagation()}>
              <DayPicker
                mode="range"
                locale={ja}
                selected={p1Selected}
                onSelect={handleP1Select}
                defaultMonth={p1DefaultMonth}
                numberOfMonths={2}
                showOutsideDays
                fixedWeeks
              />
            </DayPickerWrapper>
          </>
        )}
      </PeriodSection>

      {/* ── 期間2 ── */}
      <PeriodSection
        $active={activeSection === 'period2'}
        $color="#f59e0b"
        onClick={() => setActiveSection('period2')}
      >
        <SectionHeader>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SectionTitle $color="#f59e0b">期間2（比較期間）</SectionTitle>
            <label
              style={{ fontSize: '0.75rem', cursor: 'pointer' }}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={comparisonEnabled}
                onChange={(e) => onComparisonToggle(e.target.checked)}
                style={{ marginRight: '4px' }}
              />
              有効
            </label>
          </div>
          {comparisonEnabled && (
            <div>
              <SectionDateRange>
                {toDateKey(period2.from)} 〜 {toDateKey(period2.to)}
              </SectionDateRange>
              <SectionDays>({p2Days}日間)</SectionDays>
            </div>
          )}
        </SectionHeader>

        {activeSection === 'period2' && comparisonEnabled && (
          <>
            <PresetRow>
              {COMPARISON_PRESETS.map((p) => (
                <PresetChip
                  key={p.key}
                  $active={activePreset === p.key}
                  onClick={(e) => {
                    e.stopPropagation()
                    onPresetChange(p.key)
                  }}
                >
                  {p.label}
                </PresetChip>
              ))}
            </PresetRow>
            {activePreset === 'custom' && (
              <DayPickerWrapper onClick={(e) => e.stopPropagation()}>
                <DayPicker
                  mode="range"
                  locale={ja}
                  selected={p2Selected}
                  onSelect={handleP2Select}
                  defaultMonth={p2DefaultMonth}
                  numberOfMonths={2}
                  showOutsideDays
                  fixedWeeks
                />
              </DayPickerWrapper>
            )}
            {activePreset !== 'custom' && (
              <div
                style={{ fontSize: '0.75rem', color: '#9ca3af', padding: '4px 0' }}
                onClick={(e) => e.stopPropagation()}
              >
                プリセット連動中 — 「自由指定」を選択するとカレンダーで編集できます
              </div>
            )}
          </>
        )}

        {!comparisonEnabled && activeSection === 'period2' && (
          <div style={{ fontSize: '0.75rem', color: '#9ca3af', padding: '4px 0' }}>
            比較を有効にするとカレンダーが表示されます
          </div>
        )}
      </PeriodSection>
    </DualPeriodPanel>
  )
}
