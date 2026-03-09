import { useTheme } from 'styled-components'
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useCalculation, useStoreSelection, usePrevYearData } from '@/application/hooks'
import { useMonthSwitcher } from '@/application/hooks/useMonthSwitcher'
import { usePeriodSelection } from '@/application/hooks/usePeriodResolver'
import { toDateKey } from '@/domain/models'
import type { DateRange } from '@/domain/models'
import type { ComparisonPreset } from '@/domain/models/PeriodSelection'
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
import { DualPeriodPicker } from './DualPeriodPicker'

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
 * InlineDualPeriodPicker — 期間1・期間2 の統合ピッカー
 *
 * 1つのバッジをクリックすると、期間1・期間2 を上下に分けた
 * 統合パネルが開く。期間選択の全操作がこのパネルで完結する。
 */
function InlineDualPeriodPicker() {
  const { selection, setPeriod1, setPeriod2, setPreset, setComparisonEnabled } =
    usePeriodSelection()
  const settings = useSettingsStore((s) => s.settings)
  const [open, setOpen] = useState(false)

  const { from, to } = selection.period1
  const daysInMonth = useMemo(
    () => new Date(from.year, from.month, 0).getDate(),
    [from.year, from.month],
  )
  const isFullMonth = from.day === 1 && to.day === daysInMonth

  const isSameMonth = from.year === to.year && from.month === to.month
  const p1Label = isSameMonth
    ? `${from.month}/${from.day}〜${to.day}日`
    : `${toDateKey(from)}〜${toDateKey(to)}`

  // 比較期間のラベル
  const p2From = selection.period2.from
  const p2To = selection.period2.to
  const p2SameMonth = p2From.year === p2To.year && p2From.month === p2To.month
  const p2Label = p2SameMonth
    ? `${p2From.year}/${p2From.month}/${p2From.day}〜${p2To.day}`
    : `${toDateKey(p2From)}〜${toDateKey(p2To)}`

  const handleP1Change = useCallback(
    (range: DateRange) => {
      setPeriod1(range)
    },
    [setPeriod1],
  )
  const handleP2Change = useCallback(
    (range: DateRange) => {
      setPeriod2(range)
    },
    [setPeriod2],
  )
  const handlePresetChange = useCallback(
    (preset: ComparisonPreset) => {
      setPreset(preset)
    },
    [setPreset],
  )
  const handleComparisonToggle = useCallback(
    (enabled: boolean) => {
      setComparisonEnabled(enabled)
    },
    [setComparisonEnabled],
  )

  return (
    <BadgeWrapper>
      <PeriodBadgeButton onClick={() => setOpen(!open)} $isPartial={!isFullMonth}>
        {p1Label}
      </PeriodBadgeButton>
      {selection.comparisonEnabled && (
        <span
          style={{
            fontSize: '0.75rem',
            color: '#9ca3af',
            marginLeft: '4px',
            cursor: 'pointer',
          }}
          onClick={() => setOpen(!open)}
        >
          vs {p2Label}
        </span>
      )}
      {open && (
        <>
          <PickerOverlay onClick={() => setOpen(false)} />
          <DualPeriodPicker
            period1={selection.period1}
            period2={selection.period2}
            comparisonEnabled={selection.comparisonEnabled}
            activePreset={selection.activePreset}
            onPeriod1Change={handleP1Change}
            onPeriod2Change={handleP2Change}
            onPresetChange={handlePresetChange}
            onComparisonToggle={handleComparisonToggle}
            year={settings.targetYear}
            month={settings.targetMonth}
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
          <InlineDualPeriodPicker />
          {storeName && <StoreBadge>{storeName}</StoreBadge>}
        </TitleRow>
        <HeaderChipArea>
          <HeaderContext />
          {actions}
        </HeaderChipArea>
      </Header>
      {children}
    </Main>
  )
}
