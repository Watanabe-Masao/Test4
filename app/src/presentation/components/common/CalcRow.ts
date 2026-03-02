import styled from 'styled-components'

/**
 * 計算結果を「ラベル: 値」形式で表示する行コンポーネント群。
 * Insight（損益構造）、Reports（P&Lカード）で共通利用。
 * $clickable を指定すると MetricBreakdownPanel 連携用のホバーエフェクトが付く。
 */

export const CalcRow = styled.div<{ $clickable?: boolean }>`
  display: flex;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[3]} 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  ${({ $clickable, theme }) =>
    $clickable &&
    `
    cursor: pointer;
    border-radius: ${theme.radii.sm};
    padding: ${theme.spacing[3]} ${theme.spacing[2]};
    margin: 0 -${theme.spacing[2]};
    transition: background ${theme.transitions.fast};
    &:hover {
      background: ${theme.colors.bg4};
    }
    &:hover span:last-child {
      text-decoration: underline;
      text-decoration-style: dotted;
    }
  `}
`

export const CalcLabel = styled.span`
  color: ${({ theme }) => theme.colors.text2};
`

export const CalcValue = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
`

export const CalcHighlight = styled(CalcValue)<{ $color?: string }>`
  color: ${({ $color, theme }) => $color ?? theme.colors.palette.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
`
