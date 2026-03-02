import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { TabBar, Tab } from '@/presentation/components/common'

const meta: Meta<typeof TabBar> = {
  title: 'Common/TabBar',
  component: TabBar,
  tags: ['autodocs'],
}

export default meta

function TabBarDemo({ tabs, initial = 0 }: { tabs: string[]; initial?: number }) {
  const [active, setActive] = useState(initial)
  return (
    <TabBar>
      {tabs.map((label, i) => (
        <Tab key={label} $active={active === i} onClick={() => setActive(i)}>
          {label}
        </Tab>
      ))}
    </TabBar>
  )
}

export const Default: StoryObj = {
  render: () => <TabBarDemo tabs={['概要', '詳細', '推移']} />,
}

export const ManyTabs: StoryObj = {
  render: () => (
    <TabBarDemo
      tabs={['売上', '仕入', '粗利', '値入率', '売変', '予算', '前年比']}
      initial={2}
    />
  ),
}

export const TwoTabs: StoryObj = {
  render: () => <TabBarDemo tabs={['在庫法', '推定法']} initial={0} />,
}
