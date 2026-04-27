/**
 * @responsibility R:unclassified
 */

import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import type { ValidationMessage } from '@/domain/models/record'
import {
  MessageList,
  MessageItem,
  MessageHeader,
  LevelBadge,
  DetailsToggle,
  DetailsList,
  DetailLine,
  NextStepsBox,
  NextStepsTitle,
  NextStepsText,
} from './ValidationModal.styles'

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

function NextStepsSection({ messages }: { messages: readonly ValidationMessage[] }) {
  const errors = messages.filter((m) => m.level === 'error')
  const warnings = messages.filter((m) => m.level === 'warning')

  if (errors.length > 0) {
    return (
      <NextStepsBox $variant="error">
        <NextStepsTitle>次のステップ</NextStepsTitle>
        <NextStepsText>エラーを修正してから再インポートしてください。</NextStepsText>
      </NextStepsBox>
    )
  }

  if (warnings.length > 0) {
    return (
      <NextStepsBox $variant="warning">
        <NextStepsTitle>次のステップ</NextStepsTitle>
        <NextStepsText>データは取り込まれましたが、以下を確認してください。</NextStepsText>
      </NextStepsBox>
    )
  }

  return (
    <NextStepsBox $variant="success">
      <NextStepsTitle>次のステップ</NextStepsTitle>
      <NextStepsText>取り込み完了！ KPI画面で結果を確認してください。</NextStepsText>
    </NextStepsBox>
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
      <NextStepsSection messages={messages} />
    </Modal>
  )
}
