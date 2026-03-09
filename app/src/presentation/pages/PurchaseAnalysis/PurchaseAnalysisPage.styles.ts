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

export const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
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
    ${({ $sortable, theme }) => ($sortable ? `background: ${theme.colors.bg3};` : '')}
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

export const TrTotal = styled.tr`
  background: ${({ theme }) => theme.colors.bg2};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
`

export const Badge = styled.span<{ $color: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  margin-right: 6px;
  flex-shrink: 0;
`

export const MarkupCell = styled.td<{ $rate: number }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  text-align: right;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ $rate, theme }) =>
    $rate >= 0.25
      ? theme.colors.palette.successDark
      : $rate >= 0.15
        ? theme.colors.palette.warningDark
        : theme.colors.palette.dangerDark};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  white-space: nowrap;
`

export const MarkupIndicator = styled.span<{ $isDown: boolean }>`
  font-size: 0.7rem;
  margin-left: 4px;
  color: ${({ $isDown, theme }) =>
    $isDown ? theme.colors.palette.dangerDark : theme.colors.palette.successDark};
`

export const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[8]};
  color: ${({ theme }) => theme.colors.text4};
  font-size: ${({ theme }) => theme.typography.fontSize.lg};
`

export const ChartWrapper = styled.div`
  height: 300px;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const SubNote = styled.span`
  font-size: 0.7rem;
  color: ${({ theme }) => theme.colors.text4};
`
