import { useTheme } from 'styled-components'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useCalculation, useStoreSelection, usePrevYearData } from '@/application/hooks'
import { useMonthSwitcher } from '@/application/hooks/useMonthSwitcher'
import { usePeriodSelection } from '@/application/hooks/usePeriodResolver'
import { DayRangeSlider } from '@/presentation/components/charts/DayRangeSlider'
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
  PeriodDropdown,
  PeriodLabel,
  PeriodResetBtn,
} from './MainContent.styles'
import { ComparisonPresetToggle } from './ComparisonPresetToggle'

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
 * period1 の from.day 〜 to.day をコンパクトに表示し、
 * クリックで DayRangeSlider を含むドロップダウンを開く。
 * 月全日と異なる場合はバッジの色で視覚的に区別する。
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
    (start: number, end: number) => {
      setPeriod1({
        from: { ...from, day: start },
        to: { ...to, day: end },
      })
    },
    [from, to, setPeriod1],
  )

  const handleReset = useCallback(() => {
    setPeriod1({
      from: { ...from, day: 1 },
      to: { ...to, day: daysInMonth },
    })
  }, [from, to, daysInMonth, setPeriod1])

  const label = isFullMonth ? `1〜${daysInMonth}日` : `${from.day}〜${to.day}日`

  return (
    <BadgeWrapper>
      <PeriodBadgeButton onClick={() => setOpen(!open)} $isPartial={!isFullMonth}>
        {label}
      </PeriodBadgeButton>
      {open && (
        <>
          <PickerOverlay onClick={() => setOpen(false)} />
          <PeriodDropdown>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <PeriodLabel>分析期間</PeriodLabel>
              {!isFullMonth && <PeriodResetBtn onClick={handleReset}>全期間</PeriodResetBtn>}
            </div>
            <DayRangeSlider
              min={1}
              max={daysInMonth}
              start={from.day}
              end={to.day}
              onChange={handleChange}
            />
          </PeriodDropdown>
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
          {storeName && <StoreBadge>{storeName}</StoreBadge>}
        </TitleRow>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ComparisonPresetToggle />
          <HeaderContext />
          {actions}
        </div>
      </Header>
      {children}
    </Main>
  )
}
