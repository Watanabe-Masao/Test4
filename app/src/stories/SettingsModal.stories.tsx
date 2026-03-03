import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { SettingsModal } from '@/presentation/components/common/SettingsModal'
import { Button } from '@/presentation/components/common'
import { createDefaultSettings } from '@/domain/constants/defaults'

const meta: Meta<typeof SettingsModal> = {
  title: 'Common/SettingsModal',
  component: SettingsModal,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
}

export default meta

function SettingsModalRender() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button $variant="primary" onClick={() => setOpen(true)}>
        設定を開く
      </Button>
      {open && (
        <SettingsModal
          settings={createDefaultSettings()}
          onSave={() => setOpen(false)}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

export const Default: StoryObj = {
  render: () => <SettingsModalRender />,
}
