import styled from 'styled-components'

// ─── Forecast Tools Styled Components ───────────────────

export const ForecastToolsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[8]};
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`

export const ToolCard = styled.div<{ $accent: string }>`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-top: 4px solid ${({ $accent }) => $accent};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[8]};
`

export const ToolCardTitle = styled.h4`
  font-size: ${({ theme }) => theme.typography.fontSize.body};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`

export const ToolInputGroup = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const ToolInputField = styled.input`
  width: 100%;
  padding: ${({ theme }) => `${theme.spacing[4]} ${theme.spacing[6]}`};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.body};
  background: ${({ theme }) => theme.colors.bg2};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  color: ${({ theme }) => theme.colors.text};
  outline: none;
  &:focus {
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

export const ToolInputSub = styled.div<{ $color?: string }>`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $color, theme }) => $color ?? theme.colors.text4};
  margin-top: ${({ theme }) => theme.spacing[1]};
  text-align: right;
`

export const ToolResultSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing[8]};
  padding-top: ${({ theme }) => theme.spacing[6]};
  border-top: 2px solid ${({ theme }) => theme.colors.border};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`

export const ToolResultValue = styled.span<{ $color?: string }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.body};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ $color, theme }) => $color ?? theme.colors.text};
`

export const ToolResultLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  color: ${({ theme }) => theme.colors.text3};
`
