import type { Meta, StoryObj } from '@storybook/react'
import { UploadCard } from '@/presentation/components/common/UploadCard'

const noop = () => {}

const meta: Meta<typeof UploadCard> = {
  title: 'Common/UploadCard',
  component: UploadCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
}

export default meta
type Story = StoryObj<typeof UploadCard>

export const NotLoaded: Story = {
  args: {
    dataType: 'purchase',
    label: '仕入データ',
    loaded: false,
    onFile: noop,
  },
}

export const Loaded: Story = {
  args: {
    dataType: 'classifiedSales',
    label: '分類別売上',
    loaded: true,
    filename: 'sales_2026_03.xlsx',
    maxDay: 28,
    onFile: noop,
  },
}

export const AllTypes: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 120px)', gap: 8 }}>
      <UploadCard dataType="purchase" label="仕入" loaded={false} onFile={noop} />
      <UploadCard dataType="classifiedSales" label="分類別売上" loaded={true} onFile={noop} />
      <UploadCard dataType="budget" label="予算" loaded={false} onFile={noop} />
      <UploadCard
        dataType="consumables"
        label="消耗品"
        loaded={true}
        filename="cons.csv"
        onFile={noop}
      />
      <UploadCard dataType="categoryTimeSales" label="時間帯売上" loaded={false} onFile={noop} />
      <UploadCard dataType="flowers" label="花" loaded={true} maxDay={15} onFile={noop} />
    </div>
  ),
}
