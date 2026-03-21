/**
 * ChartCard — 統一チャートカードシェルのスタイル
 *
 * variant:
 *   'card'    — スタンドアロン。背景・ボーダー・シャドウ付き（デフォルト）
 *   'section' — 親カード内のサブセクション。背景を薄くし、シャドウなし
 *
 * 全値はテーマトークン経由。直接色・サイズ指定なし。
 */
import styled, { css } from 'styled-components'

export type ChartCardVariant = 'card' | 'section'

const cardStyle = css`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[5]} ${({ theme }) => theme.spacing[4]}
    ${({ theme }) => theme.spacing[4]};
  box-shadow: ${({ theme }) => theme.shadows.sm};
  transition: box-shadow ${({ theme }) => theme.transitions.fast}
    ${({ theme }) => theme.transitions.ease};

  &:hover {
    box-shadow: ${({ theme }) => theme.shadows.md};
  }
`

const sectionStyle = css`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)'};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[4]};
`

export const CardShell = styled.div<{ $variant?: ChartCardVariant }>`
  width: 100%;
  display: flex;
  flex-direction: column;
  ${({ $variant }) => ($variant === 'section' ? sectionStyle : cardStyle)}
`

export const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
`

export const TitleArea = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  min-width: 0;
`

export const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

export const Subtitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text4};
  margin-top: ${({ theme }) => theme.spacing[0]};
`

export const ChartBody = styled.div<{ $height?: number }>`
  flex: 1;
  ${({ $height }) => $height != null && `height: ${$height}px;`}
`
