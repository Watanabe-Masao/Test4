/**
 * ChartToolbar — 統一ツールバースタイル
 *
 * 全値はテーマトークン経由。直接色・サイズ指定なし。
 */
import styled from 'styled-components'

export const ToolbarRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  align-items: center;
  flex-wrap: wrap;
`

export const ToolbarGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
  align-items: center;
`

export const ToolbarLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text4};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  line-height: 1;
  margin-right: ${({ theme }) => theme.spacing[1]};
`
