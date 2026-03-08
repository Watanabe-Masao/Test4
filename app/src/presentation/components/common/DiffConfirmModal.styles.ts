import styled from 'styled-components'

export const Summary = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  line-height: 1.6;
`

export const DataTypeSection = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const DataTypeHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg3};
  border-radius: ${({ theme }) => theme.radii.md};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  cursor: pointer;
  user-select: none;

  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
`

export const DataTypeName = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

export const Badge = styled.span<{ $type: 'insert' | 'modify' | 'remove' }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  padding: 1px ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  background: ${({ $type, theme }) =>
    $type === 'insert'
      ? `${theme.colors.palette.success}22`
      : $type === 'modify'
        ? `${theme.colors.palette.warning}22`
        : `${theme.colors.palette.danger}22`};
  color: ${({ $type, theme }) =>
    $type === 'insert'
      ? theme.colors.palette.success
      : $type === 'modify'
        ? theme.colors.palette.warning
        : theme.colors.palette.danger};
`

export const ChangeList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 200px;
  overflow-y: auto;
  padding-left: ${({ theme }) => theme.spacing[3]};
`

export const ChangeRow = styled.div`
  display: grid;
  grid-template-columns: 80px 40px 1fr;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text3};
  padding: 2px 0;
  align-items: center;
`

export const StoreLabel = styled.span`
  color: ${({ theme }) => theme.colors.text2};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`

export const DayLabel = styled.span`
  color: ${({ theme }) => theme.colors.text3};
  text-align: right;
`

export const ValueChange = styled.span`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  align-items: center;
`

export const OldValue = styled.span`
  color: ${({ theme }) => theme.colors.palette.danger};
  text-decoration: line-through;
`

export const NewValue = styled.span`
  color: ${({ theme }) => theme.colors.palette.success};
`

export const Arrow = styled.span`
  color: ${({ theme }) => theme.colors.text4};
`

export const SectionLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text4};
  text-transform: uppercase;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
`

export const HelpText = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  margin-top: ${({ theme }) => theme.spacing[2]};
  line-height: 1.5;
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg3};
  border-radius: ${({ theme }) => theme.radii.md};
`

export const ButtonGroup = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
`
