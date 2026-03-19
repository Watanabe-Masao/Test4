/**
 * ChartToolbar — 統一ツールバースタイル
 *
 * SegmentedControl, Chip群, Slider 等を水平配置する。
 * ChartParts.styles.ts の ControlStrip をベースに統合。
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

/** ツールバーラベルの文字間調整 */
const TOOLBAR_LABEL_LETTER_SPACING = '0.02em'

export const ToolbarLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  letter-spacing: ${TOOLBAR_LABEL_LETTER_SPACING};
  line-height: 1;
  margin-right: ${({ theme }) => theme.spacing[1]};
`
