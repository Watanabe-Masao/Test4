/**
 * ChartState — 統一ローディング/エラー/空状態コンポーネント
 *
 * チャートごとに個別実装されていた3状態を統合。
 * ChartCard 内で使用する。
 * @responsibility R:unclassified
 */
import styled from 'styled-components'
import { ChartSkeleton } from '@/presentation/components/common/feedback'

/** 状態表示のデフォルト高さ (px) */
const DEFAULT_STATE_HEIGHT = 200

const StateContainer = styled.div<{ $height: number }>`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: ${({ $height }) => $height}px;
`

const StateText = styled.div<{ $variant: 'error' | 'empty' }>`
  text-align: center;
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  color: ${({ $variant, theme }) =>
    $variant === 'error' ? theme.colors.text3 : theme.colors.text4};
  padding: ${({ theme }) => theme.spacing[8]};
  line-height: 1.6;
`

/** @uic-id UIC-005 */
export function ChartLoading({ height }: { height?: number }) {
  return <ChartSkeleton height={`${height ?? DEFAULT_STATE_HEIGHT}px`} />
}

export function ChartError({ message, height }: { message: string; height?: number }) {
  return (
    <StateContainer $height={height ?? DEFAULT_STATE_HEIGHT}>
      <StateText $variant="error">{message}</StateText>
    </StateContainer>
  )
}

export function ChartEmpty({ message, height }: { message?: string; height?: number }) {
  return (
    <StateContainer $height={height ?? DEFAULT_STATE_HEIGHT}>
      <StateText $variant="empty">{message ?? 'データがありません'}</StateText>
    </StateContainer>
  )
}
