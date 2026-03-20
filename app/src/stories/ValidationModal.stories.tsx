import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { ValidationModal } from '@/presentation/components/common/ValidationModal'
import { Button } from '@/presentation/components/common/layout'
import type { ValidationMessage } from '@/domain/models/record'

const meta: Meta<typeof ValidationModal> = {
  title: 'Common/ValidationModal',
  component: ValidationModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
}

export default meta

function ValidationModalRender({ messages }: { messages: readonly ValidationMessage[] }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button $variant="primary" onClick={() => setOpen(true)}>
        検証結果を開く
      </Button>
      {open && <ValidationModal messages={messages} onClose={() => setOpen(false)} />}
    </>
  )
}

export const WithErrors: StoryObj = {
  render: () => (
    <ValidationModalRender
      messages={[
        {
          level: 'error',
          message: '仕入データに不正な値があります',
          details: ['行 15: 金額が負の値 (-500)', '行 23: 店舗IDが空'],
        },
        {
          level: 'warning',
          message: '予算データが未設定の店舗があります',
          details: ['店舗A', '店舗B'],
        },
        { level: 'info', message: '3ファイル、合計215件のレコードを検出しました' },
      ]}
    />
  ),
}

export const WarningsOnly: StoryObj = {
  render: () => (
    <ValidationModalRender
      messages={[
        {
          level: 'warning',
          message: '前年同月データが存在しない店舗があります',
          details: ['新店舗X（2025年3月以降に開店）'],
        },
        { level: 'warning', message: '消耗品データの日付範囲が月末まで到達していません' },
        { level: 'info', message: 'データは正常に取り込まれました' },
      ]}
    />
  ),
}

export const AllSuccess: StoryObj = {
  render: () => (
    <ValidationModalRender
      messages={[
        { level: 'info', message: '全データの検証が正常に完了しました' },
        { level: 'info', message: '6ファイル、合計1,024件のレコードを取り込みました' },
      ]}
    />
  ),
}
