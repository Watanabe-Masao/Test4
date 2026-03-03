import type { Meta, StoryObj } from '@storybook/react'
import { FileDropZone } from '@/presentation/components/common/FileDropZone'

const noop = () => {}

const meta: Meta<typeof FileDropZone> = {
  title: 'Common/FileDropZone',
  component: FileDropZone,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
}

export default meta

export const Default: StoryObj<typeof FileDropZone> = {
  args: { onFiles: noop },
  decorators: [(Story) => <div style={{ width: 400 }}><Story /></div>],
}
