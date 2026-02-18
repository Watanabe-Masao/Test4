import styled from 'styled-components'

export const ChartSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`

export const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[12]};
  color: ${({ theme }) => theme.colors.text3};
`

export const TableWrapper = styled.div`
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  margin-top: ${({ theme }) => theme.spacing[6]};
`

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

export const Th = styled.th`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  text-align: right;
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme }) => theme.colors.text3};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;

  &:first-child { text-align: center; }
`

export const Td = styled.td<{ $positive?: boolean; $negative?: boolean }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  text-align: right;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ $positive, $negative, theme }) =>
    $positive ? theme.colors.palette.success : $negative ? theme.colors.palette.danger : theme.colors.text};

  &:first-child { text-align: center; color: ${({ theme }) => theme.colors.text2}; }
`

export const Tr = styled.tr`
  &:hover { background: ${({ theme }) => theme.colors.bg4}; }
`

export const ToggleSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`
