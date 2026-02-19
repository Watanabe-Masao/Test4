/**
 * データ復元確認ダイアログ
 *
 * ページ再訪時に保存済みデータの復元を確認する。
 */
import styled from 'styled-components'
import { Modal } from './Modal'
import { Button } from './Button'
import type { PersistedMeta } from '@/infrastructure/storage/IndexedDBStore'

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`

const Info = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text2};
  line-height: 1.6;
`

const MetaInfo = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text3};
  background: ${({ theme }) => theme.colors.bg3};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  border-radius: ${({ theme }) => theme.radii.md};
`

const ButtonGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
`

export function RestoreDataModal({
  meta,
  onRestore,
  onDiscard,
}: {
  meta: PersistedMeta
  onRestore: () => void
  onDiscard: () => void
}) {
  const savedDate = new Date(meta.savedAt)
  const formattedDate = `${savedDate.getFullYear()}/${savedDate.getMonth() + 1}/${savedDate.getDate()} ${savedDate.getHours()}:${String(savedDate.getMinutes()).padStart(2, '0')}`

  return (
    <Modal
      title="保存データの復元"
      onClose={onDiscard}
      footer={
        <ButtonGroup>
          <Button $variant="outline" onClick={onDiscard}>
            新規で開始
          </Button>
          <Button $variant="primary" onClick={onRestore}>
            復元する
          </Button>
        </ButtonGroup>
      }
    >
      <Content>
        <Info>
          前回のセッションで保存されたデータがあります。復元しますか？
        </Info>
        <MetaInfo>
          対象期間: {meta.year}年{meta.month}月{'\n'}
          保存日時: {formattedDate}
        </MetaInfo>
        <Info>
          「新規で開始」を選択すると、保存データは破棄されます。
        </Info>
      </Content>
    </Modal>
  )
}
