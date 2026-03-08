/**
 * 年月セレクター
 *
 * 対象年月を前月/翌月ボタンまたは直接入力で切り替える。
 * 年月変更は計算結果・前年比較・予算分析など全体に影響するため、
 * 視認性の高い位置に配置し、現在の対象年月を常に明示する。
 */
import { useCallback, useState } from 'react'
import { useSettings } from '@/application/hooks/useSettings'
import { useMonthSwitcher } from '@/application/hooks/useMonthSwitcher'
import {
  Container,
  ArrowButton,
  MonthDisplay,
  PickerOverlay,
  PickerDropdown,
  PickerHeader,
  YearLabel,
  YearArrow,
  MonthGrid,
  MonthCell,
  SwitchingOverlay,
} from './MonthSelector.styles'

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
