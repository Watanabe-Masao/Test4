import styled from 'styled-components'

export const RawTableWrapper = styled.div`
  overflow-x: auto;
  max-height: 70vh;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
`

export const RawTable = styled.table`
  width: max-content;
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

export const RawTh = styled.th<{ $sticky?: boolean }>`
  position: sticky;
  top: 0;
  z-index: ${({ $sticky }) => ($sticky ? 6 : 5)};
  ${({ $sticky }) => $sticky && 'left: 0;'}
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg3};
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text2};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  text-align: right;
  white-space: nowrap;
`

export const RawTd = styled.td<{ $sticky?: boolean; $zero?: boolean }>`
  ${({ $sticky }) => $sticky && 'position: sticky; left: 0; z-index: 3;'}
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $sticky, theme }) => ($sticky ? theme.colors.bg3 : 'transparent')};
  text-align: ${({ $sticky }) => ($sticky ? 'center' : 'right')};
  color: ${({ $zero, theme }) => ($zero ? theme.colors.text4 : theme.colors.text)};
  white-space: nowrap;
`

export const DataTypeSelect = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const DataChip = styled.button<{ $active: boolean }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  background: ${({ $active, theme }) =>
    $active ? `${theme.colors.palette.primary}20` : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text3)};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  border-radius: ${({ theme }) => theme.radii.pill};
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
`

export const TotalRow = styled.tr`
  font-weight: 700;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
`
