import styled from 'styled-components'
import { useState } from 'react'
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
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
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

const MessageHeader = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[3]};
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

const DetailsToggle = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text3};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  cursor: pointer;
  padding: 0;
  margin-left: auto;
  white-space: nowrap;

  &:hover {
    color: ${({ theme }) => theme.colors.text2};
  }
`

const DetailsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-left: ${({ theme }) => theme.spacing[8]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  max-height: 150px;
  overflow-y: auto;
`

const DetailLine = styled.div`
  line-height: 1.4;
`

const LEVEL_LABELS: Record<ValidationMessage['level'], string> = {
  error: 'ERROR',
  warning: 'WARN',
  info: 'INFO',
}

function MessageEntry({ msg }: { msg: ValidationMessage }) {
  const [expanded, setExpanded] = useState(false)
  const hasDetails = msg.details && msg.details.length > 0

  return (
    <MessageItem $level={msg.level}>
      <MessageHeader>
        <LevelBadge $level={msg.level}>{LEVEL_LABELS[msg.level]}</LevelBadge>
        <span>{msg.message}</span>
        {hasDetails && (
          <DetailsToggle onClick={() => setExpanded(!expanded)}>
            {expanded ? '▲ 閉じる' : `▼ 詳細 (${msg.details!.length})`}
          </DetailsToggle>
        )}
      </MessageHeader>
      {expanded && hasDetails && (
        <DetailsList>
          {msg.details!.map((d, j) => (
            <DetailLine key={j}>{d}</DetailLine>
          ))}
        </DetailsList>
      )}
    </MessageItem>
  )
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
          <MessageEntry key={i} msg={msg} />
        ))}
      </MessageList>
    </Modal>
  )
}
