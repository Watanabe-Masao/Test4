import styled from 'styled-components'

export const Wrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]} ${({ theme }) => theme.spacing[4]}
    ${({ theme }) => theme.spacing[4]};
`

export const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

export const Subtitle = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const ControlRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
`

export const ChipGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[1]};
`

export const ChipLabel = styled.span`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
  margin-right: ${({ theme }) => theme.spacing[1]};
`

export const Chip = styled.button<{ $active: boolean }>`
  padding: 2px 8px;
  font-size: 0.6rem;
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.2)'
        : 'rgba(99,102,241,0.08)'
      : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text3)};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

export const SummaryRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-top: ${({ theme }) => theme.spacing[3]};
  padding: 0 ${({ theme }) => theme.spacing[2]};
  font-size: 0.6rem;
  flex-wrap: wrap;
`

export const SummaryItem = styled.div`
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

export const ErrorMsg = styled.div`
  padding: 24px;
  text-align: center;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text3};
`

export const BreadcrumbBar = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.6rem;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

export const BreadcrumbItem = styled.button<{ $active: boolean }>`
  background: none;
  border: none;
  padding: 2px 4px;
  font-size: 0.6rem;
  cursor: ${({ $active }) => ($active ? 'default' : 'pointer')};
  color: ${({ $active, theme }) => ($active ? theme.colors.text : theme.colors.palette.primary)};
  font-weight: ${({ $active, theme }) =>
    $active ? theme.typography.fontWeight.semibold : theme.typography.fontWeight.normal};
  text-decoration: ${({ $active }) => ($active ? 'none' : 'underline')};

  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`

export const BreadcrumbSep = styled.span`
  color: ${({ theme }) => theme.colors.text4};
`

export const ExcludeInfo = styled.div`
  font-size: 0.55rem;
  color: ${({ theme }) => theme.colors.text4};
  margin-bottom: 4px;
`

export const ResetLink = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.palette.primary};
  cursor: pointer;
  font-size: 0.55rem;
  text-decoration: underline;
  padding: 0;
`
