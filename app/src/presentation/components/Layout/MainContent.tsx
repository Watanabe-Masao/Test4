import { useTheme } from 'styled-components'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useCalculation, useStoreSelection, usePrevYearData } from '@/application/hooks'
import { useMonthSwitcher } from '@/application/hooks/useMonthSwitcher'
import { usePeriodSelection } from '@/application/hooks/usePeriodResolver'
import { toDateKey } from '@/domain/models'
import type { DateRange } from '@/domain/models'
import {
  Main,
  Header,
  TitleRow,
  Title,
  StoreBadge,
  StatusDot,
  ContextBar,
  MonthBadgeButton,
  BadgeWrapper,
  PickerOverlay,
  PickerDropdown,
  PickerHeader,
  YearArrow,
  YearLabel,
  MonthGrid,
  MonthCell,
  PeriodBadgeButton,
  HeaderChipArea,
} from './MainContent.styles'
import { ComparisonPresetToggle } from './ComparisonPresetToggle'
import { CalendarRangePicker } from './CalendarRangePicker'

// ── Components ──

/**
 * InlineMonthPicker — 対象年月切替コンポーネント
 *
 * 計算エンジンのデータパイプラインの起点。
 * 表示されている対象年月に応じて以下を自動的にトリガーする:
 *
 * 1. 当月データを IndexedDB からロード → dataStore に格納
 * 2. useAutoLoadPrevYear が targetYear/targetMonth の変更を検知し、
 *    前年同月データを自動ロード
 * 3. JS 計算エンジンが前年同曜日・同日の値をいつでも使用できる状態になる
 *
 * ユーザーが「分析期間を選ぶ」UI ではなく、
 * 計算に必要な全データを揃えるための年月切替機構。
 */
function InlineMonthPicker() {
  const settings = useSettingsStore((s) => s.settings)
  const { isSwitching, switchMonth } = useMonthSwitcher()
  const [open, setOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(settings.targetYear)
  const wrapperRef = useRef<HTMLDivElement>(null)

  const handleOpen = useCallback(() => {
    setPickerYear(settings.targetYear)
    setOpen(true)
  }, [settings.targetYear])

  const handleSelect = useCallback(
    async (month: number) => {
      setOpen(false)
      await switchMonth(pickerYear, month)
    },
    [pickerYear, switchMonth],
  )

  if (isSwitching) {
    return (
      <MonthBadgeButton disabled style={{ opacity: 0.6 }}>
        切替中...
      </MonthBadgeButton>
    )
  }

  return (
    <BadgeWrapper ref={wrapperRef}>
      <MonthBadgeButton onClick={handleOpen}>
        {settings.targetYear}/{settings.targetMonth}月
      </MonthBadgeButton>
      {open && (
        <>
          <PickerOverlay onClick={() => setOpen(false)} />
          <PickerDropdown>
            <PickerHeader>
              <YearArrow onClick={() => setPickerYear((y) => y - 1)}>◀</YearArrow>
              <YearLabel>{pickerYear}年</YearLabel>
              <YearArrow onClick={() => setPickerYear((y) => y + 1)}>▶</YearArrow>
            </PickerHeader>
            <MonthGrid>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <MonthCell
                  key={m}
                  $active={pickerYear === settings.targetYear && m === settings.targetMonth}
                  onClick={() => handleSelect(m)}
                >
                  {m}月
                </MonthCell>
              ))}
            </MonthGrid>
          </PickerDropdown>
        </>
      )}
    </BadgeWrapper>
  )
}

/**
 * InlinePeriodPicker — 分析期間（日範囲）の指定コンポーネント
 *
 * period1 の日付範囲をコンパクトに表示し、
 * クリックで CalendarRangePicker（react-day-picker）を開く。
 * 2ヶ月並列表示で月跨ぎの期間指定を直感的に行える。
 */
function InlinePeriodPicker() {
  const { selection, setPeriod1 } = usePeriodSelection()
  const [open, setOpen] = useState(false)

  const { from, to } = selection.period1
  const daysInMonth = useMemo(
    () => new Date(from.year, from.month, 0).getDate(),
    [from.year, from.month],
  )
  const isFullMonth = from.day === 1 && to.day === daysInMonth

  const handleChange = useCallback(
    (range: DateRange) => {
      setPeriod1(range)
    },
    [setPeriod1],
  )

  const isSameMonth = from.year === to.year && from.month === to.month
  const label = isSameMonth
    ? isFullMonth
      ? `${from.month}/${from.day}〜${to.day}日`
      : `${from.month}/${from.day}〜${to.day}日`
    : `${toDateKey(from)}〜${toDateKey(to)}`

  return (
    <BadgeWrapper>
      <PeriodBadgeButton onClick={() => setOpen(!open)} $isPartial={!isFullMonth}>
        {label}
      </PeriodBadgeButton>
      {open && (
        <>
          <PickerOverlay onClick={() => setOpen(false)} />
          <CalendarRangePicker
            value={selection.period1}
            onChange={handleChange}
            label="分析期間（期間-1）"
            year={from.year}
            month={from.month}
            daysInMonth={daysInMonth}
          />
        </>
      )}
    </BadgeWrapper>
  )
}

/**
 * InlineComparisonPeriodBadge — 比較期間の表示・編集コンポーネント
 *
 * period2 の年月日範囲をコンパクトに表示する。
 * クリックで年月選択グリッド＋日範囲スライダーのドロップダウンを開き、
 * 比較先を自由に変更できる。
 */
/**
 * InlineComparisonPeriodBadge — 比較期間の表示・編集コンポーネント
 *
 * period2 の年月日範囲をコンパクトに表示する。
 * クリックで CalendarRangePicker を開き、
 * 比較先を自由に変更できる。
 */
function InlineComparisonPeriodBadge() {
  const { selection, setPeriod2 } = usePeriodSelection()
  const [open, setOpen] = useState(false)

  const { from, to } = selection.period2
  const isSameMonth = from.year === to.year && from.month === to.month
  const daysInMonth = useMemo(
    () => new Date(from.year, from.month, 0).getDate(),
    [from.year, from.month],
  )

  const label = isSameMonth
    ? `${from.year}/${from.month}月 ${from.day}〜${to.day}日`
    : `${toDateKey(from)}〜${toDateKey(to)}`

  const isCustom = selection.activePreset === 'custom'

  const handleChange = useCallback(
    (range: DateRange) => {
      setPeriod2(range)
    },
    [setPeriod2],
  )

  if (!selection.comparisonEnabled) return null

  return (
    <BadgeWrapper>
      <PeriodBadgeButton onClick={() => setOpen(!open)} $isPartial={isCustom}>
        vs {label}
      </PeriodBadgeButton>
      {open && (
        <>
          <PickerOverlay onClick={() => setOpen(false)} />
          <CalendarRangePicker
            value={selection.period2}
            onChange={handleChange}
            label={
              isCustom
                ? '比較期間（期間-2）'
                : '比較期間（期間-2）— プリセット連動中'
            }
            year={from.year}
            month={from.month}
            daysInMonth={daysInMonth}
          />
        </>
      )}
    </BadgeWrapper>
  )
}

function HeaderContext() {
  const { isCalculated, isComputing } = useCalculation()
  const { stores, selectedStoreIds } = useStoreSelection()
  const prevYear = usePrevYearData()
  const theme = useTheme()

  const storeLabel =
    selectedStoreIds.size === 0 || selectedStoreIds.size === stores.size
      ? `${stores.size}店舗`
      : `${selectedStoreIds.size}/${stores.size}店舗`

  const statusColor = isComputing
    ? theme.colors.palette.blueDark
    : isCalculated
      ? theme.colors.palette.successDark
      : theme.colors.palette.warningDark

  return (
    <ContextBar>
      <StatusDot $color={statusColor} />
      <span>{storeLabel}</span>
      {prevYear.hasPrevYear && <span>| 前年有</span>}
    </ContextBar>
  )
}

export function MainContent({
  title,
  storeName,
  actions,
  children,
}: {
  title: string
  storeName?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <Main>
      <Header>
        <TitleRow>
          <Title>{title}</Title>
          <InlineMonthPicker />
          <InlinePeriodPicker />
          <InlineComparisonPeriodBadge />
          {storeName && <StoreBadge>{storeName}</StoreBadge>}
        </TitleRow>
        <HeaderChipArea>
          <ComparisonPresetToggle />
          <HeaderContext />
          {actions}
        </HeaderChipArea>
      </Header>
      {children}
    </Main>
  )
}
