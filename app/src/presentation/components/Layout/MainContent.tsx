import styled, { useTheme } from 'styled-components'
import { useCallback, useRef, useState, type ReactNode } from 'react'
import { useSettingsStore } from '@/application/stores/settingsStore'
import { useCalculation, useStoreSelection, usePrevYearData } from '@/application/hooks'
import { useMonthSwitcher } from '@/application/hooks/useMonthSwitcher'

const Main = styled.main`
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing[8]};
  background: ${({ theme }) => theme.colors.bg};
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`

const Title = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

const Badge = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.pill};
`

const MonthBadgeButton = styled.button`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.pill};
  color: ${({ theme }) => theme.colors.text2};
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid transparent;
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  position: relative;

  &:hover {
    border-color: ${({ theme }) => theme.colors.palette.primary}60;
    background: ${({ theme }) => theme.colors.palette.primary}10;
    color: ${({ theme }) => theme.colors.palette.primary};
  }
`

const StoreBadge = styled(Badge)`
  color: ${({ theme }) => theme.colors.palette.primary};
  background: ${({ theme }) => theme.colors.palette.primary}15;
`

const StatusDot = styled.span<{ $color: string }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  display: inline-block;
`

const ContextBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
`

// ── Month Picker Popup ──

const PickerOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 200;
`

const PickerDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  z-index: 201;
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  padding: ${({ theme }) => theme.spacing[4]};
  min-width: 220px;
`

const PickerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

const YearLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

const YearArrow = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: transparent;
  color: ${({ theme }) => theme.colors.text3};
  cursor: pointer;
  font-size: 12px;
  touch-action: manipulation;

  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
    color: ${({ theme }) => theme.colors.text};
  }
`

const MonthGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: ${({ theme }) => theme.spacing[1]};
`

const MonthCell = styled.button<{ $active?: boolean }>`
  padding: ${({ theme }) => theme.spacing[2]};
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : 'transparent')};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ $active, theme }) =>
    $active ? `${theme.colors.palette.primary}20` : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text)};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ $active, theme }) =>
    $active ? theme.typography.fontWeight.bold : theme.typography.fontWeight.normal};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  touch-action: manipulation;

  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
`

const BadgeWrapper = styled.div`
  position: relative;
  display: inline-block;
`

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
          {storeName && <StoreBadge>{storeName}</StoreBadge>}
        </TitleRow>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <HeaderContext />
          {actions}
        </div>
      </Header>
      {children}
    </Main>
  )
}
