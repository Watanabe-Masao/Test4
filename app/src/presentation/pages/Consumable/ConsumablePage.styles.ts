import styled from 'styled-components'

export const Section = styled.section`
  margin-bottom: ${({ theme }) => theme.spacing[8]};
`

export const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const TableWrapper = styled.div`
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
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
  &:first-child { text-align: left; }
`

export const Td = styled.td<{ $muted?: boolean }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  text-align: right;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ $muted, theme }) => $muted ? theme.colors.text4 : theme.colors.text};
  &:first-child {
    text-align: left;
    font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
    color: ${({ theme }) => theme.colors.text2};
  }
`

export const Tr = styled.tr<{ $clickable?: boolean; $selected?: boolean }>`
  &:hover { background: ${({ theme }) => theme.colors.bg4}; }
  cursor: ${({ $clickable }) => $clickable ? 'pointer' : 'default'};
  ${({ $selected, theme }) => $selected && `
    background: ${theme.colors.palette.primary}10;
    &:hover { background: ${theme.colors.palette.primary}18; }
  `}
`

export const TrTotal = styled.tr`
  background: ${({ theme }) => theme.colors.bg2};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  td { font-weight: ${({ theme }) => theme.typography.fontWeight.bold}; }
`

export const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[12]};
  color: ${({ theme }) => theme.colors.text3};
`

export const Bar = styled.div<{ $width: number; $color: string }>`
  display: inline-block;
  width: ${({ $width }) => $width}%;
  max-width: 120px;
  height: 6px;
  border-radius: 3px;
  background: ${({ $color }) => $color};
  margin-right: ${({ theme }) => theme.spacing[2]};
  vertical-align: middle;
`

export const RankBadge = styled.span<{ $rank: number }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: 0.65rem;
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  font-family: ${({ theme }) => theme.typography.fontFamily.primary};
  background: ${({ $rank }) =>
    $rank === 1 ? '#f59e0b' : $rank === 2 ? '#94a3b8' : $rank === 3 ? '#d97706' : 'transparent'};
  color: ${({ $rank, theme }) => $rank <= 3 ? 'white' : theme.colors.text4};
  margin-right: ${({ theme }) => theme.spacing[2]};
`

export const DetailPanel = styled.div`
  margin-top: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[5]};
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  border-left: 3px solid ${({ theme }) => theme.colors.palette.primary};
`

export const DetailHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const DetailTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

export const DetailClose = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.bg4};
  color: ${({ theme }) => theme.colors.text3};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  &:hover { background: ${({ theme }) => theme.colors.border}; }
`

export const PairGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[6]};
  margin-bottom: ${({ theme }) => theme.spacing[8]};

  @media (max-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: 1fr;
  }
`
