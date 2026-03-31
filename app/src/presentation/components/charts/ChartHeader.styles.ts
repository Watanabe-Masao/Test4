/**
 * ChartHeader styled-components
 *
 * ChartHelpButton / ChartGuidePanel 専用スタイル。
 * ChartHeaderRow/ChartTitle/ChartViewToggle 等は ChartCard に統合済みのため削除。
 */
import styled from 'styled-components'

export const HelpBtn = styled.button<{ $active?: boolean }>`
  all: unset;
  cursor: pointer;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  font-weight: 700;
  margin-left: ${({ theme }) => theme.spacing[2]};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.white : theme.colors.text4)};
  background: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : 'transparent')};
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text4)};
  transition:
    color ${({ theme }) => theme.transitions.fast} ${({ theme }) => theme.transitions.ease},
    background ${({ theme }) => theme.transitions.fast} ${({ theme }) => theme.transitions.ease},
    border-color ${({ theme }) => theme.transitions.fast} ${({ theme }) => theme.transitions.ease},
    transform ${({ theme }) => theme.transitions.fast} ${({ theme }) => theme.transitions.ease};
  flex-shrink: 0;
  &:hover {
    color: ${({ theme }) => theme.colors.text};
    border-color: ${({ theme }) => theme.colors.text3};
  }
  &:active {
    transform: ${({ theme }) => theme.interaction.pressScale};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.interaction.focusRing};
  }
`

export const GuidePanel = styled.div`
  background: ${({ theme }) => theme.interactive.subtleBg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  margin: 0 ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text3};
  line-height: 1.6;
`

export const GuidePurpose = styled.div`
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

export const GuideList = styled.ul`
  margin: 0;
  padding-left: 1.2em;
  li {
    margin-bottom: 2px;
  }
`

export const GuideSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing[2]};
`

export const GuideSectionLabel = styled.span`
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`

export const MetricTag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  margin: 2px 4px 2px 0;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.interactive.mutedBg};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  white-space: nowrap;
`

export const MetricSummary = styled.span`
  opacity: 0.7;
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
`
