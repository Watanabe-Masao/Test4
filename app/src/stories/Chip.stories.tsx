import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Chip, ChipGroup } from '@/presentation/components/common'

const meta: Meta<typeof Chip> = {
  title: 'Common/Chip',
  component: Chip,
  tags: ['autodocs'],
  argTypes: {
    $active: { control: 'boolean' },
  },
}

export default meta
type Story = StoryObj<typeof Chip>

export const Default: Story = {
  args: { children: 'カテゴリ' },
}

export const Active: Story = {
  args: { children: '選択中', $active: true },
}

export const StoreSelector: StoryObj = {
  render: () => {
    const stores = ['全店', '渋谷店', '新宿店', '池袋店', '横浜店', '大宮店']
    const [selected, setSelected] = useState<Set<string>>(new Set(['全店']))
    return (
      <ChipGroup>
        {stores.map((store) => (
          <Chip
            key={store}
            $active={selected.has(store)}
            onClick={() => {
              setSelected((prev) => {
                const next = new Set(prev)
                if (next.has(store)) next.delete(store)
                else next.add(store)
                return next
              })
            }}
          >
            {store}
          </Chip>
        ))}
      </ChipGroup>
    )
  },
}
