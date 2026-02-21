/**
 * 差分確認ダイアログ
 *
 * 既存データとインポートデータの差分を表示し、
 * ユーザーに「上書き」「既存を維持」の選択を求める。
 */
import styled from 'styled-components'
import { useState } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import type { DiffResult, DataTypeDiff, FieldChange } from '@/domain/models'

// ─── Styled ──────────────────────────────────────────────

const Summary = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  line-height: 1.6;
`

const DataTypeSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

const DataTypeHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg3};
  border-radius: ${({ theme }) => theme.radii.md};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  cursor: pointer;
  user-select: none;

  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
`

const DataTypeName = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

const Badge = styled.span<{ $type: 'insert' | 'modify' | 'remove' }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  padding: 1px ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  background: ${({ $type, theme }) =>
    $type === 'insert'
      ? `${theme.colors.palette.success}22`
      : $type === 'modify'
        ? `${theme.colors.palette.warning}22`
        : `${theme.colors.palette.danger}22`};
  color: ${({ $type, theme }) =>
    $type === 'insert'
      ? theme.colors.palette.success
      : $type === 'modify'
        ? theme.colors.palette.warning
        : theme.colors.palette.danger};
`

const ChangeList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 200px;
  overflow-y: auto;
  padding-left: ${({ theme }) => theme.spacing[3]};
`

const ChangeRow = styled.div`
  display: grid;
  grid-template-columns: 80px 40px 1fr;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text3};
  padding: 2px 0;
  align-items: center;
`

const StoreLabel = styled.span`
  color: ${({ theme }) => theme.colors.text2};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

const DayLabel = styled.span`
  color: ${({ theme }) => theme.colors.text3};
  text-align: right;
`

const ValueChange = styled.span`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  align-items: center;
`

const OldValue = styled.span`
  color: ${({ theme }) => theme.colors.palette.danger};
  text-decoration: line-through;
`

const NewValue = styled.span`
  color: ${({ theme }) => theme.colors.palette.success};
`

const Arrow = styled.span`
  color: ${({ theme }) => theme.colors.text4};
`

const SectionLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text4};
  text-transform: uppercase;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
`

const HelpText = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  margin-top: ${({ theme }) => theme.spacing[2]};
  line-height: 1.5;
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg3};
  border-radius: ${({ theme }) => theme.radii.md};
`

const ButtonGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
`

// ─── サブコンポーネント ──────────────────────────────────

function ChangeEntry({ change, type }: { change: FieldChange; type: 'insert' | 'modify' | 'remove' }) {
  const formatNum = (v: number | string | null) => {
    if (v === null) return '-'
    if (typeof v === 'number') return v.toLocaleString()
    return v
  }

  return (
    <ChangeRow>
      <StoreLabel title={change.storeName}>{change.storeName}</StoreLabel>
      <DayLabel>{change.day}日</DayLabel>
      <ValueChange>
        {type === 'insert' && (
          <NewValue>+ {formatNum(change.newValue)}</NewValue>
        )}
        {type === 'modify' && (
          <>
            <OldValue>{formatNum(change.oldValue)}</OldValue>
            <Arrow>&rarr;</Arrow>
            <NewValue>{formatNum(change.newValue)}</NewValue>
          </>
        )}
        {type === 'remove' && (
          <OldValue>- {formatNum(change.oldValue)}</OldValue>
        )}
      </ValueChange>
    </ChangeRow>
  )
}

function DataTypeDiffSection({ diff }: { diff: DataTypeDiff }) {
  const [expanded, setExpanded] = useState(false)
  const hasConfirmNeeded = diff.modifications.length > 0 || diff.removals.length > 0

  return (
    <DataTypeSection>
      <DataTypeHeader onClick={() => setExpanded(!expanded)}>
        <DataTypeName>{diff.dataTypeName}</DataTypeName>
        {diff.inserts.length > 0 && <Badge $type="insert">+{diff.inserts.length}</Badge>}
        {diff.modifications.length > 0 && <Badge $type="modify">{diff.modifications.length}変更</Badge>}
        {diff.removals.length > 0 && <Badge $type="remove">-{diff.removals.length}</Badge>}
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#71717a' }}>
          {expanded ? '▲' : '▼'}
        </span>
      </DataTypeHeader>

      {expanded && (
        <>
          {diff.inserts.length > 0 && (
            <>
              <SectionLabel>新規挿入（自動反映）</SectionLabel>
              <ChangeList>
                {diff.inserts.slice(0, 50).map((c, i) => (
                  <ChangeEntry key={i} change={c} type="insert" />
                ))}
                {diff.inserts.length > 50 && (
                  <ChangeRow>
                    <span style={{ gridColumn: '1 / -1', color: '#71717a' }}>
                      ...他 {diff.inserts.length - 50}件
                    </span>
                  </ChangeRow>
                )}
              </ChangeList>
            </>
          )}

          {diff.modifications.length > 0 && (
            <>
              <SectionLabel>値変更（確認必要）</SectionLabel>
              <ChangeList>
                {diff.modifications.slice(0, 50).map((c, i) => (
                  <ChangeEntry key={i} change={c} type="modify" />
                ))}
                {diff.modifications.length > 50 && (
                  <ChangeRow>
                    <span style={{ gridColumn: '1 / -1', color: '#71717a' }}>
                      ...他 {diff.modifications.length - 50}件
                    </span>
                  </ChangeRow>
                )}
              </ChangeList>
            </>
          )}

          {diff.removals.length > 0 && (
            <>
              <SectionLabel>値削除（確認必要）</SectionLabel>
              <ChangeList>
                {diff.removals.slice(0, 50).map((c, i) => (
                  <ChangeEntry key={i} change={c} type="remove" />
                ))}
                {diff.removals.length > 50 && (
                  <ChangeRow>
                    <span style={{ gridColumn: '1 / -1', color: '#71717a' }}>
                      ...他 {diff.removals.length - 50}件
                    </span>
                  </ChangeRow>
                )}
              </ChangeList>
            </>
          )}

          {hasConfirmNeeded && (
            <HelpText>
              「値変更」「値削除」のある項目は、新規データで上書きするか既存データを維持するか選択できます。
            </HelpText>
          )}
        </>
      )}
    </DataTypeSection>
  )
}

// ─── メインコンポーネント ────────────────────────────────

export interface DiffConfirmResult {
  /** 新規データで上書きする */
  readonly action: 'overwrite' | 'keep-existing' | 'cancel'
}

export function DiffConfirmModal({
  diffResult,
  onConfirm,
}: {
  diffResult: DiffResult
  onConfirm: (result: DiffConfirmResult) => void
}) {
  const totalModify = diffResult.diffs.reduce((s, d) => s + d.modifications.length, 0)
  const totalRemove = diffResult.diffs.reduce((s, d) => s + d.removals.length, 0)
  const totalInsert = diffResult.diffs.reduce((s, d) => s + d.inserts.length, 0)

  return (
    <Modal
      title="データの差分確認"
      onClose={() => onConfirm({ action: 'cancel' })}
      footer={
        <ButtonGroup>
          <Button $variant="ghost" onClick={() => onConfirm({ action: 'cancel' })}>
            キャンセル
          </Button>
          <Button $variant="outline" onClick={() => onConfirm({ action: 'keep-existing' })}>
            既存を維持
          </Button>
          <Button $variant="primary" onClick={() => onConfirm({ action: 'overwrite' })}>
            新規データで上書き
          </Button>
        </ButtonGroup>
      }
    >
      <Summary>
        保存済みデータとインポートデータに差分があります。
        {totalInsert > 0 && <><br />新規挿入: {totalInsert}件（自動反映）</>}
        {totalModify > 0 && <><br />値変更: {totalModify}件（確認必要）</>}
        {totalRemove > 0 && <><br />値削除: {totalRemove}件（確認必要）</>}
      </Summary>

      {diffResult.diffs
        .filter((d) => d.inserts.length > 0 || d.modifications.length > 0 || d.removals.length > 0)
        .map((diff) => (
          <DataTypeDiffSection key={diff.dataType} diff={diff} />
        ))}

      <HelpText>
        <strong>新規データで上書き</strong>: インポートしたCSVの内容で全て置き換えます。<br />
        <strong>既存を維持</strong>: 新規挿入のみ反映し、既存の値は変更しません。<br />
        <strong>キャンセル</strong>: インポートを取り消し、何も変更しません。
      </HelpText>
    </Modal>
  )
}
