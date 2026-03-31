/**
 * MetricBreakdownPanel — スタイル定義
 */
import styled from 'styled-components'

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: ${({ theme }) => theme.zIndex.modal};
  background: ${({ theme }) => theme.interactive.backdrop};
  backdrop-filter: blur(${({ theme }) => theme.modal.backdropBlur}) saturate(180%);
  -webkit-backdrop-filter: blur(${({ theme }) => theme.modal.backdropBlur}) saturate(180%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing[4]};
  animation: mbpFadeIn ${({ theme }) => theme.transitions.fast}
    ${({ theme }) => theme.transitions.ease};

  @keyframes mbpFadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`

export const Panel = styled.div`
  background: ${({ theme }) => theme.colors.bg2}f2;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  backdrop-filter: blur(${({ theme }) => theme.modal.containerBlur}) saturate(180%);
  -webkit-backdrop-filter: blur(${({ theme }) => theme.modal.containerBlur}) saturate(180%);
  max-width: 640px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  padding: ${({ theme }) => theme.spacing[6]};
  animation: mbpSlideIn ${({ theme }) => theme.transitions.normal}
    ${({ theme }) => theme.transitions.spring};

  @keyframes mbpSlideIn {
    from {
      opacity: 0;
      transform: scale(0.96) translateY(8px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
`

export const MbpHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const MbpTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin: 0;
`

export const ValueDisplay = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.palette.primary};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  margin-top: ${({ theme }) => theme.spacing[1]};
`

export const CloseButton = styled.button`
  all: unset;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text4};
  font-size: ${({ theme }) => theme.typography.fontSize.heading};
  transition:
    background ${({ theme }) => theme.transitions.fast} ${({ theme }) => theme.transitions.ease},
    color ${({ theme }) => theme.transitions.fast} ${({ theme }) => theme.transitions.ease},
    transform ${({ theme }) => theme.transitions.fast} ${({ theme }) => theme.transitions.ease};
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
    color: ${({ theme }) => theme.colors.text};
  }
  &:active {
    transform: ${({ theme }) => theme.interaction.pressScale};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.interaction.focusRing};
  }
`

export const MbpSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing[5]};
`

export const MbpSectionTitle = styled.h4`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text4};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 ${({ theme }) => theme.spacing[3]} 0;
`

export const FormulaBox = styled.div`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg3};
  border-radius: ${({ theme }) => theme.radii.md};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text2};
  border-left: 3px solid ${({ theme }) => theme.colors.palette.primary};
`

export const InputList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`

export const InputRow = styled.div<{ $clickable?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bg3};
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  transition: background ${({ theme }) => theme.transitions.fast}
    ${({ theme }) => theme.transitions.ease};

  ${({ $clickable, theme }) =>
    $clickable &&
    `
    &:hover {
      background: ${theme.colors.bg4};
    }
  `}
`

export const InputName = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text2};
`

export const InputValue = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
`

export const LinkIcon = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  color: ${({ theme }) => theme.colors.palette.primary};
  margin-left: ${({ theme }) => theme.spacing[1]};
`

export const ScopeInfo = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  margin-top: ${({ theme }) => theme.spacing[1]};
`

export const BreadcrumbBar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
`

export const BreadcrumbLink = styled.button`
  all: unset;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.palette.primary};
  &:hover {
    text-decoration: underline;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

export const BreadcrumbSep = styled.span`
  color: ${({ theme }) => theme.colors.text4};
  margin: 0 2px;
`

export const RelatedMetricRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bg3};
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
`

export const RelatedMetricName = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.palette.primary};
`

export const RelatedMetricValue = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text3};
`

export const TableWrap = styled.div`
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
`

export const MbpTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
`

export const MbpTh = styled.th`
  position: sticky;
  top: 0;
  background: ${({ theme }) => theme.colors.bg3};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  text-align: left;
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text3};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  &:last-child {
    text-align: right;
  }
`

export const MbpTr = styled.tr<{ $expandable?: boolean; $expanded?: boolean }>`
  cursor: ${({ $expandable }) => ($expandable ? 'pointer' : 'default')};
  background: ${({ $expanded, theme }) =>
    $expanded ? `${theme.colors.palette.primary}08` : 'transparent'};

  ${({ $expandable, theme }) =>
    $expandable &&
    `
    &:hover {
      background: ${theme.colors.bg4};
    }
  `}
`

export const MbpTd = styled.td`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  color: ${({ theme }) => theme.colors.text2};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border}08;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};

  &:last-child {
    text-align: right;
  }
`

export const ExpandIcon = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  margin-right: ${({ theme }) => theme.spacing[1]};
  color: ${({ theme }) => theme.colors.text4};
`

export const DetailRow = styled.tr`
  background: ${({ theme }) => theme.colors.bg3};
`

export const DetailTd = styled.td`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  padding-left: ${({ theme }) => theme.spacing[8]};
  color: ${({ theme }) => theme.colors.text4};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border}04;

  &:last-child {
    text-align: right;
  }
`

export const MbpTabBar = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

export const TabButton = styled.button<{ $active: boolean }>`
  all: unset;
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ $active, theme }) =>
    $active ? theme.typography.fontWeight.semibold : theme.typography.fontWeight.normal};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text4)};
  background: ${({ $active, theme }) =>
    $active ? `${theme.colors.palette.primary}15` : 'transparent'};
  transition:
    background ${({ theme }) => theme.transitions.fast} ${({ theme }) => theme.transitions.ease},
    color ${({ theme }) => theme.transitions.fast} ${({ theme }) => theme.transitions.ease},
    transform ${({ theme }) => theme.transitions.fast} ${({ theme }) => theme.transitions.ease};
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
  &:active {
    transform: ${({ theme }) => theme.interaction.pressScale};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.interaction.focusRing};
  }
`

export const EvidenceBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.palette.primary}10;
  color: ${({ theme }) => theme.colors.palette.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`

export const ActionButton = styled.button`
  all: unset;
  cursor: pointer;
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text3};
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  transition:
    background ${({ theme }) => theme.transitions.fast} ${({ theme }) => theme.transitions.ease},
    color ${({ theme }) => theme.transitions.fast} ${({ theme }) => theme.transitions.ease},
    transform ${({ theme }) => theme.transitions.fast} ${({ theme }) => theme.transitions.ease};

  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
    color: ${({ theme }) => theme.colors.text};
  }
  &:active {
    transform: ${({ theme }) => theme.interaction.pressScale};
  }
  &:focus-visible {
    outline: none;
    box-shadow: ${({ theme }) => theme.interaction.focusRing};
  }
`

export const CopiedFeedback = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.palette.primary};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`

export const FormulaDetailBox = styled.div`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg3};
  border-radius: ${({ theme }) => theme.radii.md};
  border-left: 3px solid ${({ theme }) => theme.colors.palette.info};
`

export const FormulaExpression = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

export const FormulaDescription = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

export const SourceTag = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.palette.info};
  background: ${({ theme }) => theme.colors.palette.info}10;
  padding: 1px ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.sm};
`

/** Warning alert box for MetricBreakdownPanel formula tab */
export const WarningAlertBox = styled.div<{
  $severity: 'info' | 'warning' | 'critical'
}>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${({ $severity, theme }) =>
    $severity === 'critical'
      ? `${theme.colors.palette.danger}10`
      : $severity === 'warning'
        ? `${theme.colors.palette.warningDark}10`
        : `${theme.colors.palette.primary}08`};
  border-radius: ${({ theme }) => theme.radii.md};
  border-left: 3px solid
    ${({ $severity, theme }) =>
      $severity === 'critical'
        ? theme.colors.palette.danger
        : $severity === 'warning'
          ? theme.colors.palette.warningDark
          : theme.colors.palette.primary};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text2};
`

/** Display mode badge for MetricBreakdownPanel header */
export const DisplayModeBadge = styled.span<{
  $mode: 'reference' | 'hidden'
}>`
  display: inline-flex;
  align-items: center;
  padding: 1px ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  margin-left: ${({ theme }) => theme.spacing[2]};
  background: ${({ $mode, theme }) =>
    $mode === 'hidden' ? `${theme.colors.palette.danger}10` : `${theme.colors.text4}15`};
  color: ${({ $mode, theme }) =>
    $mode === 'hidden' ? theme.colors.palette.danger : theme.colors.text4};
`

export const WarningAlertLabel = styled.span<{
  $severity: 'info' | 'warning' | 'critical'
}>`
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ $severity, theme }) =>
    $severity === 'critical'
      ? theme.colors.palette.danger
      : $severity === 'warning'
        ? theme.colors.palette.warningDeep
        : theme.colors.palette.primary};
  white-space: nowrap;
`
