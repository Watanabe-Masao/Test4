import styled from 'styled-components'
import { Modal } from './Modal'
import { Button } from './Button'
import type { ValidationMessage } from '@/domain/models'

const MessageList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`

const MessageItem = styled.div<{ $level: ValidationMessage['level'] }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  background: ${({ $level, theme }) =>
    $level === 'error'
      ? `${theme.colors.palette.danger}18`
      : $level === 'warning'
        ? `${theme.colors.palette.warning}18`
        : `${theme.colors.palette.primary}18`};
  border-left: 3px solid ${({ $level, theme }) =>
    $level === 'error'
      ? theme.colors.palette.danger
      : $level === 'warning'
        ? theme.colors.palette.warning
        : theme.colors.palette.primary};
  color: ${({ theme }) => theme.colors.text};
`

const LevelBadge = styled.span<{ $level: ValidationMessage['level'] }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  text-transform: uppercase;
  white-space: nowrap;
  color: ${({ $level, theme }) =>
    $level === 'error'
      ? theme.colors.palette.danger
      : $level === 'warning'
        ? theme.colors.palette.warning
        : theme.colors.palette.primary};
`

const LEVEL_LABELS: Record<ValidationMessage['level'], string> = {
  error: 'ERROR',
  warning: 'WARN',
  info: 'INFO',
}

export function ValidationModal({
  messages,
  onClose,
}: {
  messages: readonly ValidationMessage[]
  onClose: () => void
}) {
  const errors = messages.filter((m) => m.level === 'error')
  const warnings = messages.filter((m) => m.level === 'warning')
  const infos = messages.filter((m) => m.level === 'info')
  const sorted = [...errors, ...warnings, ...infos]

  return (
    <Modal
      title="インポート検証結果"
      onClose={onClose}
      footer={<Button onClick={onClose}>閉じる</Button>}
    >
      <MessageList>
        {sorted.map((msg, i) => (
          <MessageItem key={i} $level={msg.level}>
            <LevelBadge $level={msg.level}>{LEVEL_LABELS[msg.level]}</LevelBadge>
            {msg.message}
          </MessageItem>
        ))}
      </MessageList>
    </Modal>
  )
}
