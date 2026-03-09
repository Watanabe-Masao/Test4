import styled from 'styled-components'

export const Section = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

export const TableWrapper = styled.div`
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
`

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`

export const Th = styled.th<{ $align?: 'left' | 'right'; $sortable?: boolean }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  text-align: ${({ $align }) => $align ?? 'right'};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text3};
  background: ${({ theme }) => theme.colors.bg2};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  cursor: ${({ $sortable }) => ($sortable ? 'pointer' : 'default')};
  user-select: none;

  &:hover {
    ${({ $sortable, theme }) =>
      $sortable ? `background: ${theme.colors.bg3};` : ''}
  }
`

export const Td = styled.td<{ $align?: 'left' | 'right' }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  text-align: ${({ $align }) => $align ?? 'right'};
  color: ${({ theme }) => theme.colors.text};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  white-space: nowrap;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

export const DiffCell = styled(Td)<{ $positive?: boolean }>`
  color: ${({ $positive, theme }) =>
    $positive == null
      ? theme.colors.text4
      : $positive
        ? theme.colors.palette.positive
        : theme.colors.palette.negative};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
`

export const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[8]};
  color: ${({ theme }) => theme.colors.text4};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
`
