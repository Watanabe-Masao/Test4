import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import {
  ImportProgress as ImportProgressSteps,
  ImportSummaryCard,
} from '@/presentation/components/common/ImportWizard'
import type { ImportStage } from '@/presentation/components/common/ImportWizard'
import { Button } from '@/presentation/components/common/layout'

// ─── ImportProgressSteps ─────────────────────────────────

const progressMeta: Meta<typeof ImportProgressSteps> = {
  title: 'Common/ImportProgressSteps',
  component: ImportProgressSteps,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div style={{ width: 400 }}>
        <Story />
      </div>
    ),
  ],
}

export default progressMeta
type Story = StoryObj<typeof ImportProgressSteps>

export const Reading: Story = {
  args: {
    stage: 'reading' as ImportStage,
    progress: { current: 3, total: 8, filename: 'sales_2026_03.xlsx' },
  },
}

export const Validating: Story = {
  args: {
    stage: 'validating' as ImportStage,
    progress: null,
  },
}

export const Saving: Story = {
  args: {
    stage: 'saving' as ImportStage,
    progress: null,
  },
}

export const Done: Story = {
  args: {
    stage: 'done' as ImportStage,
    progress: null,
  },
}

// ─── ImportSummaryCard ───────────────────────────────────

function SummaryCardRender() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) {
    return (
      <Button $variant="primary" onClick={() => setDismissed(false)}>
        サマリーを表示
      </Button>
    )
  }

  return (
    <div style={{ width: 400 }}>
      <ImportSummaryCard
        summary={{
          results: [
            {
              ok: true,
              filename: 'sales_2026_03.xlsx',
              type: 'classifiedSales',
              typeName: '分類別売上',
              rowCount: 124,
            },
            {
              ok: true,
              filename: 'purchase_data.csv',
              type: 'purchase',
              typeName: '仕入データ',
              rowCount: 89,
              warnings: ['ヘッダ行が2行目から開始'],
            },
            {
              ok: false,
              filename: 'broken_file.xlsx',
              type: null,
              typeName: null,
              error: 'ファイル形式が不正です',
            },
          ],
          successCount: 2,
          failureCount: 1,
        }}
        onDismiss={() => setDismissed(true)}
      />
    </div>
  )
}

export const SummaryCard: StoryObj = {
  render: () => <SummaryCardRender />,
}
