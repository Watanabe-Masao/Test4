/**
 * アプリ共通の空状態コンポーネント
 *
 * variant に応じた文言を messages.ts から取得し描画する。
 * UI は application が決めた意味を表示するだけ。
 * @responsibility R:unclassified
 */
import styled from 'styled-components'
import { useI18n } from '@/application/hooks/useI18n'

export type AppEmptyVariant = 'import' | 'result'

interface Props {
  readonly variant: AppEmptyVariant
}

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[12]};
  text-align: center;
`

const Message = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.body};
  color: ${({ theme }) => theme.colors.text2};
`

const SubMessage = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  color: ${({ theme }) => theme.colors.text3};
`

export function AppEmptyState({ variant }: Props) {
  const { messages } = useI18n()

  if (variant === 'import') {
    return (
      <Wrapper>
        <Message>{messages.lifecycle.emptyImport}</Message>
        <SubMessage>{messages.lifecycle.emptyImportAction}</SubMessage>
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      <Message>{messages.lifecycle.emptyResult}</Message>
    </Wrapper>
  )
}
