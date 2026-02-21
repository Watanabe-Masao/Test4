import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { Modal, Button } from '@/presentation/components/common'

const meta: Meta<typeof Modal> = {
  title: 'Common/Modal',
  component: Modal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
}

export default meta

function DefaultModalRender() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button $variant="primary" onClick={() => setOpen(true)}>
        モーダルを開く
      </Button>
      {open && (
        <Modal
          title="設定"
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button $variant="outline" onClick={() => setOpen(false)}>キャンセル</Button>
              <Button $variant="primary" onClick={() => setOpen(false)}>保存</Button>
            </>
          }
        >
          <p style={{ fontSize: '0.78rem' }}>モーダル内のコンテンツです。</p>
        </Modal>
      )}
    </>
  )
}

export const Default: StoryObj = {
  render: () => <DefaultModalRender />,
}

function WithoutFooterRender() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button $variant="outline" onClick={() => setOpen(true)}>
        情報表示
      </Button>
      {open && (
        <Modal title="お知らせ" onClose={() => setOpen(false)}>
          <p style={{ fontSize: '0.78rem' }}>フッターなしのシンプルモーダルです。</p>
        </Modal>
      )}
    </>
  )
}

export const WithoutFooter: StoryObj = {
  render: () => <WithoutFooterRender />,
}
