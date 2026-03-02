import styled from 'styled-components'

/**
 * 計算結果を「ラベル: 値」形式で表示する行コンポーネント群。
 * Insight（損益構造）、Reports（P&Lカード）で共通利用。
 * $clickable を指定すると MetricBreakdownPanel 連携用のホバーエフェクトが付く。
 */

export const CalcRow = styled.div.attrs<{ $clickable?: boolean }>((props) =>
  props.$clickable ? { role: 'button', tabIndex: 0 } : {},
)<{ $clickable?: boolean }>`
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
    &:focus-visible {
      outline: 2px solid ${theme.colors.palette.primary};
      outline-offset: 2px;
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

/** 在庫法/推定法のカードヘッダー下に表示する目的説明 */
export const CalcPurpose = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg2};
  border-radius: ${({ theme }) => theme.radii.sm};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  border-left: 2px solid ${({ theme }) => theme.colors.text4};
`

/** 計算不可時（在庫データ未設定等）のガイダンス表示 */
export const CalcNullGuide = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => `${theme.colors.palette.warning}10`};
  border: 1px dashed ${({ theme }) => `${theme.colors.palette.warningDark}40`};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text2};
  margin: ${({ theme }) => theme.spacing[3]} 0;
`

/** 乖離セクション（実績 vs 推定の比較表示） */
export const VarianceRow = styled.div<{ $severity?: 'low' | 'mid' | 'high' }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${({ $severity, theme }) =>
    $severity === 'high'
      ? `${theme.colors.palette.danger}12`
      : $severity === 'mid'
        ? `${theme.colors.palette.warning}12`
        : `${theme.colors.palette.success}08`};
  border-radius: ${({ theme }) => theme.radii.md};
  border-left: 3px solid
    ${({ $severity, theme }) =>
      $severity === 'high'
        ? theme.colors.palette.danger
        : $severity === 'mid'
          ? theme.colors.palette.warningDark
          : theme.colors.palette.success};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`

export const VarianceLabel = styled.span`
  color: ${({ theme }) => theme.colors.text2};
`

export const VarianceValue = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`
