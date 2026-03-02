import { useState, useCallback } from 'react'
import type { Meta, StoryObj } from '@storybook/react'
import { DayRangeSlider } from '@/presentation/components/charts/DayRangeSlider'

const meta: Meta<typeof DayRangeSlider> = {
  title: 'Charts/DayRangeSlider',
  component: DayRangeSlider,
  tags: ['autodocs'],
  argTypes: {
    min: { control: { type: 'number', min: 1, max: 31 } },
    max: { control: { type: 'number', min: 1, max: 31 } },
    elapsedDays: { control: { type: 'number', min: 0, max: 31 } },
  },
}

export default meta
type Story = StoryObj<typeof DayRangeSlider>

function SliderWrapper({
  min,
  max,
  initialStart,
  initialEnd,
  elapsedDays,
}: {
  min: number
  max: number
  initialStart: number
  initialEnd: number
  elapsedDays?: number
}) {
  const [start, setStart] = useState(initialStart)
  const [end, setEnd] = useState(initialEnd)
  const handleChange = useCallback((s: number, e: number) => {
    setStart(s)
    setEnd(e)
  }, [])
  return (
    <div style={{ maxWidth: 480 }}>
      <DayRangeSlider
        min={min}
        max={max}
        start={start}
        end={end}
        onChange={handleChange}
        elapsedDays={elapsedDays}
      />
      <p style={{ fontSize: '0.75rem', marginTop: 8, opacity: 0.6 }}>
        選択中: {start}日 〜 {end}日
      </p>
    </div>
  )
}

export const Default: Story = {
  render: () => <SliderWrapper min={1} max={28} initialStart={1} initialEnd={28} />,
}

export const PartialRange: Story = {
  render: () => <SliderWrapper min={1} max={31} initialStart={5} initialEnd={20} />,
}

export const WithElapsedDays: Story = {
  render: () => (
    <SliderWrapper min={1} max={28} initialStart={1} initialEnd={28} elapsedDays={15} />
  ),
}

export const ShortMonth: Story = {
  render: () => <SliderWrapper min={1} max={28} initialStart={1} initialEnd={28} />,
}

export const LongMonth: Story = {
  render: () => <SliderWrapper min={1} max={31} initialStart={1} initialEnd={31} />,
}
