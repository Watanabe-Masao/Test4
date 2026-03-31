import styled from 'styled-components'

export const PresetSection = styled.div`
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

export const PresetLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: 8px;
`

export const PresetGrid = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`

export const PresetCard = styled.button<{ $active?: boolean }>`
  all: unset;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  background: ${({ $active, theme }) =>
    $active ? `${theme.colors.palette.primary}15` : theme.colors.bg};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text};
  transition: all 0.15s;
  position: relative;

  &:hover {
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

export const PresetDesc = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  color: ${({ theme }) => theme.colors.text4};
  margin-top: 2px;
`

export const PresetDeleteBtn = styled.button`
  all: unset;
  cursor: pointer;
  position: absolute;
  top: -6px;
  right: -6px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.palette.danger};
  color: ${({ theme }) => theme.colors.palette.white};
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  opacity: 0;
  transition: opacity 0.15s;

  ${PresetCard}:hover & {
    opacity: 1;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

export const SaveSection = styled.div`
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`

export const SaveRow = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
`

export const SaveInput = styled.input`
  flex: 1;
  padding: 5px 8px;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text};
  outline: none;
  &:focus {
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

export const SaveBtn = styled.button`
  all: unset;
  cursor: pointer;
  padding: 4px 10px;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.palette.white};
  background: ${({ theme }) => theme.colors.palette.primary};
  border-radius: ${({ theme }) => theme.radii.sm};
  white-space: nowrap;
  transition: opacity 0.15s;
  &:hover {
    opacity: 0.85;
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

export const CustomTag = styled.span`
  display: inline-block;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  padding: 1px 4px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.palette.warning}25;
  color: ${({ theme }) => theme.colors.palette.warning};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  margin-left: 4px;
  vertical-align: middle;
`
