/**
 * 年月セレクター
 *
 * 対象年月を前月/翌月ボタンまたは直接入力で切り替える。
 * 年月変更は計算結果・前年比較・予算分析など全体に影響するため、
 * 視認性の高い位置に配置し、現在の対象年月を常に明示する。
 */
import { useCallback, useState } from 'react'
import styled from 'styled-components'
import { useSettings } from '@/application/hooks/useSettings'
import { useMonthSwitcher } from '@/application/hooks/useMonthSwitcher'

// ─── Styled Components ─────────────────────────────────

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`

const ArrowButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme }) => theme.colors.text3};
  cursor: pointer;
  font-size: 14px;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.bg4};
    color: ${({ theme }) => theme.colors.text};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`

const MonthDisplay = styled.button`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.palette.primary}40;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.palette.primary}10;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.fast};
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => theme.colors.palette.primary}20;
    border-color: ${({ theme }) => theme.colors.palette.primary}60;
  }
`

const PickerOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100;
`

const PickerDropdown = styled.div`
  position: absolute;
  z-index: 101;
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  padding: ${({ theme }) => theme.spacing[4]};
  min-width: 240px;
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
  width: 24px;
  height: 24px;
  border: none;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: transparent;
  color: ${({ theme }) => theme.colors.text3};
  cursor: pointer;
  font-size: 12px;

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

const MonthCell = styled.button<{ $active?: boolean; $hasData?: boolean }>`
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
  position: relative;

  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }

  ${({ $hasData, theme }) =>
    $hasData
      ? `&::after {
          content: '';
          position: absolute;
          bottom: 3px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: ${theme.colors.palette.success};
        }`
      : ''}
`

const SwitchingOverlay = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
`

// ─── Component ──────────────────────────────────────────

interface MonthSelectorProps {
  /** DB に保存されている年月リスト (ドット表示に使用) */
  storedMonths?: readonly { year: number; month: number }[]
}

export function MonthSelector({ storedMonths }: MonthSelectorProps) {
  const { settings } = useSettings()
  const { isSwitching, switchMonth, goToPrevMonth, goToNextMonth } = useMonthSwitcher()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState(settings.targetYear)

  const { targetYear, targetMonth } = settings

  const handleOpenPicker = useCallback(() => {
    setPickerYear(targetYear)
    setPickerOpen(true)
  }, [targetYear])

  const handleClosePicker = useCallback(() => {
    setPickerOpen(false)
  }, [])

  const handleSelectMonth = useCallback(
    async (month: number) => {
      setPickerOpen(false)
      await switchMonth(pickerYear, month)
    },
    [pickerYear, switchMonth],
  )

  const hasDataForMonth = useCallback(
    (year: number, month: number): boolean => {
      if (!storedMonths) return false
      return storedMonths.some((m) => m.year === year && m.month === month)
    },
    [storedMonths],
  )

  if (isSwitching) {
    return (
      <Container>
        <SwitchingOverlay>切替中...</SwitchingOverlay>
      </Container>
    )
  }

  return (
    <Container>
      <ArrowButton onClick={goToPrevMonth} title="前月">
        ◀
      </ArrowButton>
      <MonthDisplay onClick={handleOpenPicker} title="年月を選択">
        {targetYear}年{targetMonth}月
      </MonthDisplay>
      <ArrowButton onClick={goToNextMonth} title="翌月">
        ▶
      </ArrowButton>

      {pickerOpen && (
        <>
          <PickerOverlay onClick={handleClosePicker} />
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
                  $active={pickerYear === targetYear && m === targetMonth}
                  $hasData={hasDataForMonth(pickerYear, m)}
                  onClick={() => handleSelectMonth(m)}
                >
                  {m}月
                </MonthCell>
              ))}
            </MonthGrid>
          </PickerDropdown>
        </>
      )}
    </Container>
  )
}
