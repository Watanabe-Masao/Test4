import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { RestoreDataModal } from '@/presentation/components/common/RestoreDataModal'
import { Button } from '@/presentation/components/common'

const meta: Meta<typeof RestoreDataModal> = {
  title: 'Common/RestoreDataModal',
  component: RestoreDataModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
}

export default meta

function RestoreModalRender() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button $variant="primary" onClick={() => setOpen(true)}>
        復元ダイアログを開く
      </Button>
      {open && (
        <RestoreDataModal
          meta={{ year: 2026, month: 3, savedAt: '2026-03-02T14:30:00.000Z' }}
          onRestore={() => setOpen(false)}
          onDiscard={() => setOpen(false)}
        />
      )}
    </>
  )
}

export const Default: StoryObj = {
  render: () => <RestoreModalRender />,
}
