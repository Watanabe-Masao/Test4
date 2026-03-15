import styled, { css } from 'styled-components'

// ─── Container ──────────────────────────────────────────

export const TableWrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  overflow: hidden;
`

export const TableHeader = styled.div`
  padding: ${({ theme }) => theme.spacing[10]} ${({ theme }) => theme.spacing[10]}
    ${({ theme }) => theme.spacing[8]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

export const TableMeta = styled.div`
  font-size: 10px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text4};
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

export const TableTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.typography.fontWeight.extrabold};
  margin: 0;
  color: ${({ theme }) => theme.colors.text};
  letter-spacing: -0.5px;
`

export const ColumnHeaders = styled.div`
  display: grid;
  grid-template-columns:
    minmax(120px, 1.2fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(80px, auto)
    32px;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[10]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

export const ColumnHeaderLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text4};
  text-transform: uppercase;
  letter-spacing: 1px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  &:not(:first-child) {
    text-align: right;
  }
`

// ─── Section ────────────────────────────────────────────

export const SectionWrapper = styled.div`
  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
`

export const SectionHeader = styled.button<{ $expanded: boolean }>`
  all: unset;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  width: 100%;
  padding: ${({ theme }) => theme.spacing[7]} ${({ theme }) => theme.spacing[10]};
  cursor: pointer;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)'};
  transition: background 0.15s;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: -2px;
  }
`

export const SectionChevron = styled.span<{ $expanded: boolean }>`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.text4};
  transition: transform 0.2s;
  ${({ $expanded }) =>
    $expanded
      ? css`
          transform: rotate(90deg);
        `
      : css`
          transform: rotate(0deg);
        `}
`

export const SectionLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  letter-spacing: 0.3px;
`

// ─── Row ────────────────────────────────────────────────

export const RowWrapper = styled.div<{ $isSub: boolean; $clickable: boolean }>`
  display: grid;
  grid-template-columns:
    minmax(120px, 1.2fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(80px, auto)
    32px;
  gap: ${({ theme }) => theme.spacing[4]};
  align-items: center;
  padding: ${({ theme }) => theme.spacing[5]} ${({ theme }) => theme.spacing[10]};
  border-bottom: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)')};
  transition: background 0.12s;
  ${({ $isSub, theme }) =>
    $isSub &&
    css`
      padding-left: calc(${theme.spacing[10]} + ${theme.spacing[6]});
      opacity: 0.8;
    `}
  ${({ $clickable }) =>
    $clickable &&
    css`
      cursor: pointer;
      &:hover {
        background: ${({ theme }) =>
          theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(59,130,246,0.03)'};
      }
    `}
`

export const RowLabel = styled.span<{ $isSub: boolean }>`
  font-size: ${({ $isSub, theme }) =>
    $isSub ? theme.typography.fontSize.sm : theme.typography.fontSize.base};
  font-weight: ${({ $isSub, theme }) =>
    $isSub ? theme.typography.fontWeight.medium : theme.typography.fontWeight.bold};
  color: ${({ $isSub, theme }) => ($isSub ? theme.colors.text3 : theme.colors.text)};
`

export const RowValue = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.extrabold};
  color: ${({ theme }) => theme.colors.text};
  text-align: right;
  letter-spacing: -0.3px;
`

export const RowBudget = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  text-align: right;
`

export const RowAchievement = styled.span<{ $color: string | null }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.extrabold};
  color: ${({ $color, theme }) => $color ?? theme.colors.text4};
  text-align: right;
  letter-spacing: -0.3px;
`

export const EvidenceBtn = styled.button`
  all: unset;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text4};
  font-size: 13px;
  transition: all 0.15s;
  &:hover {
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'};
    color: ${({ theme }) => theme.colors.text};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
  }
`

// ─── Store Breakdown ────────────────────────────────────

export const BreakdownWrapper = styled.div`
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.015)' : 'rgba(59,130,246,0.02)'};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`

export const BreakdownRow = styled.div`
  display: grid;
  grid-template-columns: minmax(100px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(80px, auto);
  gap: ${({ theme }) => theme.spacing[4]};
  align-items: center;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[10]};
  padding-left: calc(${({ theme }) => theme.spacing[10]} + ${({ theme }) => theme.spacing[8]});
  border-bottom: 1px solid
    ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)')};
  &:last-child {
    border-bottom: none;
  }
`

export const BreakdownStoreName = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
`

export const BreakdownValue = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text};
  text-align: right;
`

export const BreakdownBudget = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  text-align: right;
`

export const BreakdownAch = styled.span<{ $color: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ $color }) => $color};
  text-align: right;
`

export const DrillLink = styled.button`
  all: unset;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[10]};
  padding-left: calc(${({ theme }) => theme.spacing[10]} + ${({ theme }) => theme.spacing[8]});
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.palette.primary};
  transition: opacity 0.15s;
  &:hover {
    opacity: 0.7;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
  }
`
