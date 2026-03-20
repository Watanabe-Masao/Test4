import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { DiffConfirmModal } from '@/presentation/components/common/feedback'
import { Button } from '@/presentation/components/common/layout'
import type { DiffResult } from '@/domain/models/analysis'

const meta: Meta<typeof DiffConfirmModal> = {
  title: 'Common/DiffConfirmModal',
  component: DiffConfirmModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
}

export default meta

const sampleDiff: DiffResult = {
  diffs: [
    {
      dataType: 'purchase',
      dataTypeName: '仕入データ',
      inserts: [
        {
          storeId: 'S003',
          storeName: '新店舗C',
          day: 5,
          fieldPath: 'amount',
          oldValue: null,
          newValue: 12500,
        },
        {
          storeId: 'S003',
          storeName: '新店舗C',
          day: 6,
          fieldPath: 'amount',
          oldValue: null,
          newValue: 8300,
        },
      ],
      modifications: [
        {
          storeId: 'S001',
          storeName: '本店',
          day: 3,
          fieldPath: 'amount',
          oldValue: 15000,
          newValue: 15500,
        },
        {
          storeId: 'S002',
          storeName: '支店A',
          day: 7,
          fieldPath: 'amount',
          oldValue: 9800,
          newValue: 10200,
        },
      ],
      removals: [
        {
          storeId: 'S001',
          storeName: '本店',
          day: 28,
          fieldPath: 'amount',
          oldValue: 5000,
          newValue: null,
        },
      ],
    },
    {
      dataType: 'classifiedSales',
      dataTypeName: '分類別売上',
      inserts: [
        {
          storeId: 'S001',
          storeName: '本店',
          day: 15,
          fieldPath: 'foodSales',
          oldValue: null,
          newValue: 45000,
        },
      ],
      modifications: [],
      removals: [],
    },
  ],
  needsConfirmation: true,
  autoApproved: ['classifiedSales'],
}

function DiffModalRender({ diffResult }: { diffResult: DiffResult }) {
  const [open, setOpen] = useState(false)
  const [lastAction, setLastAction] = useState<string | null>(null)

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
        <Button $variant="primary" onClick={() => setOpen(true)}>
          差分確認ダイアログを開く
        </Button>
        {lastAction && <span style={{ fontSize: 12, color: '#666' }}>選択: {lastAction}</span>}
      </div>
      {open && (
        <DiffConfirmModal
          diffResult={diffResult}
          onConfirm={(result) => {
            setLastAction(result.action)
            setOpen(false)
          }}
        />
      )}
    </>
  )
}

export const Default: StoryObj = {
  render: () => <DiffModalRender diffResult={sampleDiff} />,
}

export const InsertsOnly: StoryObj = {
  render: () => (
    <DiffModalRender
      diffResult={{
        diffs: [
          {
            dataType: 'budget',
            dataTypeName: '予算データ',
            inserts: [
              {
                storeId: 'S001',
                storeName: '本店',
                day: 1,
                fieldPath: 'budgetAmount',
                oldValue: null,
                newValue: 300000,
              },
              {
                storeId: 'S002',
                storeName: '支店A',
                day: 1,
                fieldPath: 'budgetAmount',
                oldValue: null,
                newValue: 180000,
              },
            ],
            modifications: [],
            removals: [],
          },
        ],
        needsConfirmation: false,
        autoApproved: ['budget'],
      }}
    />
  ),
}
