import styled from 'styled-components'
import { useState, useCallback } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import type { ValidationMessage } from '@/domain/models'
import { downloadTemplate, TEMPLATE_TYPES, TEMPLATE_LABELS } from '@/infrastructure/export'
import type { TemplateDataType } from '@/infrastructure/export'

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
  border-left: 3px solid
    ${({ $level, theme }) =>
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

// ─── 次のステップセクション ──────────────────────────
const NextStepsBox = styled.div<{ $variant: 'success' | 'warning' | 'error' }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.radii.md};
  margin-top: ${({ theme }) => theme.spacing[4]};
  background: ${({ $variant, theme }) =>
    $variant === 'success'
      ? `${theme.colors.palette.success}12`
      : $variant === 'warning'
        ? `${theme.colors.palette.warning}12`
        : `${theme.colors.palette.danger}12`};
  border: 1px solid
    ${({ $variant, theme }) =>
      $variant === 'success'
        ? `${theme.colors.palette.success}30`
        : $variant === 'warning'
          ? `${theme.colors.palette.warning}30`
          : `${theme.colors.palette.danger}30`};
`

const NextStepsTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
`

const NextStepsText = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  line-height: 1.6;
`

const TemplateLink = styled.button`
  all: unset;
  cursor: pointer;
  display: inline;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.palette.primary};
  text-decoration: underline;
  &:hover {
    opacity: 0.8;
  }
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

/** メッセージテキストからデータ種別のヒントを検出する */
function detectMissingTypes(messages: readonly ValidationMessage[]): TemplateDataType[] {
  const missing: TemplateDataType[] = []
  const messageText = messages.map((m) => m.message).join(' ')

  // 予算が未設定の場合
  if (messageText.includes('予算') && messageText.includes('未設定')) {
    missing.push('budget')
  }

  return missing
}

function NextStepsSection({ messages }: { messages: readonly ValidationMessage[] }) {
  const errors = messages.filter((m) => m.level === 'error')
  const warnings = messages.filter((m) => m.level === 'warning')
  const missingTypes = detectMissingTypes(messages)

  const handleTemplateDownload = useCallback((type: TemplateDataType) => {
    downloadTemplate(type)
  }, [])

  if (errors.length > 0) {
    // エラーがある場合のガイダンス
    return (
      <NextStepsBox $variant="error">
        <NextStepsTitle>次のステップ</NextStepsTitle>
        <NextStepsText>エラーを修正してから再インポートしてください。</NextStepsText>
        {TEMPLATE_TYPES.length > 0 && (
          <NextStepsText>
            テンプレートをダウンロード:{' '}
            {TEMPLATE_TYPES.map((type, i) => (
              <span key={type}>
                {i > 0 && ' / '}
                <TemplateLink onClick={() => handleTemplateDownload(type)}>
                  {TEMPLATE_LABELS[type]}
                </TemplateLink>
              </span>
            ))}
          </NextStepsText>
        )}
      </NextStepsBox>
    )
  }

  if (warnings.length > 0) {
    // 警告のみの場合のガイダンス
    return (
      <NextStepsBox $variant="warning">
        <NextStepsTitle>次のステップ</NextStepsTitle>
        <NextStepsText>データは取り込まれましたが、以下を確認してください。</NextStepsText>
        {missingTypes.length > 0 && (
          <NextStepsText>
            未取込データのテンプレート:{' '}
            {missingTypes.map((type, i) => (
              <span key={type}>
                {i > 0 && ' / '}
                <TemplateLink onClick={() => handleTemplateDownload(type)}>
                  {TEMPLATE_LABELS[type]}
                </TemplateLink>
              </span>
            ))}
          </NextStepsText>
        )}
      </NextStepsBox>
    )
  }

  // 全て成功の場合
  return (
    <NextStepsBox $variant="success">
      <NextStepsTitle>次のステップ</NextStepsTitle>
      <NextStepsText>取り込み完了！ KPI画面で結果を確認してください。</NextStepsText>
      {missingTypes.length > 0 && (
        <NextStepsText>
          追加データ:{' '}
          {missingTypes.map((type, i) => (
            <span key={type}>
              {i > 0 && ' / '}
              <TemplateLink onClick={() => handleTemplateDownload(type)}>
                {TEMPLATE_LABELS[type]}
              </TemplateLink>
            </span>
          ))}
        </NextStepsText>
      )}
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
