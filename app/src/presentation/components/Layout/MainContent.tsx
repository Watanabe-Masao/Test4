import { useTheme } from 'styled-components'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useCalculation, useStoreSelection, usePrevYearData } from '@/application/hooks'
import { useMonthSwitcher } from '@/application/hooks/useMonthSwitcher'
import { usePeriodSelection } from '@/application/hooks/usePeriodResolver'
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
  PeriodInfo,
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

function formatDateRange(range: {
  from: { year: number; month: number; day: number }
  to: { year: number; month: number; day: number }
}): string {
  const { from, to } = range
  if (from.year === to.year && from.month === to.month) {
    return `${from.year}/${from.month}/${from.day}〜${to.day}`
  }
  return `${from.year}/${from.month}/${from.day}〜${to.year}/${to.month}/${to.day}`
}

function PeriodDisplay() {
  const { selection } = usePeriodSelection()
  const label = useMemo(() => {
    const p1 = formatDateRange(selection.period1)
    const p2 = formatDateRange(selection.period2)
    return { p1, p2 }
  }, [selection.period1, selection.period2])

  return (
    <PeriodInfo>
      <span>当期: {label.p1}</span>
      {selection.comparisonEnabled && <span>比較: {label.p2}</span>}
    </PeriodInfo>
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
          <PeriodDisplay />
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
