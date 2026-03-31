import styled from 'styled-components'

export const Section = styled.div`
  margin-top: 8px;
`

export const TabRow = styled.div`
  display: flex;
  gap: 4px;
  margin: 8px 0;
`

export const TabBtn = styled.button<{ $active: boolean }>`
  padding: 3px 10px;
  border-radius: 4px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.palette.primary : theme.colors.bg2};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.white : theme.colors.text)};
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  cursor: pointer;
  &:hover {
    opacity: 0.8;
  }
`

export const PiRow = styled.div`
  display: flex;
  gap: 12px;
  margin: 4px 0 8px;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  color: ${({ theme }) => theme.colors.text2};
`

export const PiItem = styled.span<{ $color?: string }>`
  color: ${({ $color, theme }) => $color ?? theme.colors.text2};
`

export const DecompRow = styled.div`
  display: flex;
  gap: 4px;
  margin-bottom: 6px;
`

export const DecompBtn = styled.button<{ $active: boolean }>`
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.palette.primary + '18' : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text2)};
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  cursor: pointer;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  &:hover {
    opacity: 0.8;
  }
`
