import styled from 'styled-components'

export const Wrapper = styled.div`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
`

export const Title = styled.h4`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

export const Subtitle = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const TabRow = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const TabBtn = styled.button<{ $active: boolean }>`
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.palette.primary : theme.colors.bg2};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.white : theme.colors.text)};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  cursor: pointer;
  &:hover {
    opacity: 0.8;
  }
`

export const SummaryRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const SummaryItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const SummaryLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text2};
`

export const SummaryValue = styled.span<{ $color?: string }>`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

export const ModeRow = styled.div`
  display: flex;
  gap: 2px;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  border-radius: 8px;
  padding: 2px;
  width: fit-content;
`

export const ModeBtn = styled.button<{ $active: boolean }>`
  padding: 4px 14px;
  border-radius: 6px;
  border: none;
  background: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.white : 'inherit')};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  cursor: pointer;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  white-space: nowrap;
  transition: all 0.15s;
  &:hover {
    opacity: 0.85;
  }
`

export const DecompRow = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

export const DecompBtn = styled.button<{ $active: boolean }>`
  padding: 3px 10px;
  border-radius: 12px;
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.palette.primary + '18' : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text2)};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  cursor: pointer;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  &:hover {
    opacity: 0.8;
  }
`

export const HelpToggle = styled.button`
  all: unset;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.palette.primary};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  display: inline-flex;
  align-items: center;
  gap: 4px;
  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

export const HelpBox = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text2};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[5]}`};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  line-height: 1.8;
`

export const HelpFormula = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text};
  margin: 4px 0;
`
