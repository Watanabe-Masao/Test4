/**
 * TimelineSlider — 基準日を選択する range スライダー
 *
 * BudgetSimulatorWidget から抽出した単機能 UI。HTML native range input を
 * 薄くラップし、accessibility + 最小／最大ラベル表示を付与する。
 *
 * @responsibility R:form
 */
import { Card, CardTitle } from '@/presentation/components/common/layout'
import { SliderRow, SliderLabel, SliderInput } from './BudgetSimulatorWidget.styles'

interface Props {
  readonly year: number
  readonly month: number
  readonly currentDay: number
  readonly daysInMonth: number
  readonly remainingDays: number
  readonly onChange: (day: number) => void
}

export function TimelineSlider({
  year,
  month,
  currentDay,
  daysInMonth,
  remainingDays,
  onChange,
}: Props) {
  return (
    <Card>
      <CardTitle>
        基準日: {year}年 {month}月 {currentDay}日 （残 {remainingDays}日）
      </CardTitle>
      <SliderRow>
        <SliderLabel>1日</SliderLabel>
        <SliderInput
          type="range"
          min={1}
          max={daysInMonth}
          value={currentDay}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="基準日スライダー"
        />
        <SliderLabel>{daysInMonth}日</SliderLabel>
      </SliderRow>
    </Card>
  )
}
