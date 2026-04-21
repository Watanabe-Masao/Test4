/**
 * TimelineSlider — 基準日を選択する range スライダー
 *
 * プロトタイプ c-head の SliderWithMarkers 相当。Card ラッパーを持たず、
 * 親の SimulatorHeader 内に inline で並ぶ想定。
 *
 * @responsibility R:form
 */
import { SliderRow, SliderLabel, SliderInput } from './BudgetSimulatorWidget.styles'

interface Props {
  readonly currentDay: number
  readonly daysInMonth: number
  readonly onChange: (day: number) => void
}

export function TimelineSlider({ currentDay, daysInMonth, onChange }: Props) {
  return (
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
  )
}
