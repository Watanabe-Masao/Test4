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

export const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

export const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`

export const TopNSelector = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text3};
`

export const TopNSelect = styled.select`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[2]};
  font-size: 0.6rem;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme }) => theme.colors.text2};
  cursor: pointer;
`

export const TabGroup = styled.div`
  display: flex;
  gap: 2px;
  background: ${({ theme }) => theme.colors.bg2};
  border-radius: ${({ theme }) => theme.radii.sm};
  padding: 2px;
`

export const Tab = styled.button<{ $active: boolean }>`
  padding: 2px 8px;
  font-size: 0.6rem;
  border: none;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $active, theme }) => ($active ? theme.colors.bg3 : 'transparent')};
  color: ${({ $active, theme }) => ($active ? theme.colors.text : theme.colors.text4)};
  font-weight: ${({ $active, theme }) =>
    $active ? theme.typography.fontWeight.semibold : theme.typography.fontWeight.normal};
  cursor: pointer;
  transition: all 0.15s;
`

export const ChipContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[1]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

export const DeptChip = styled.button<{ $color: string; $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: 2px 8px;
  font-size: 0.6rem;
  border: 1px solid ${({ $active, $color, theme }) => ($active ? $color : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $active, $color }) => ($active ? `${$color}18` : 'transparent')};
  color: ${({ $active, $color, theme }) => ($active ? $color : theme.colors.text3)};
  cursor: pointer;
  transition: all 0.15s;
  opacity: ${({ $active }) => ($active ? 1 : 0.6)};

  &:hover {
    border-color: ${({ $color }) => $color};
    opacity: 1;
  }
`

export const ColorDot = styled.span<{ $color: string }>`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
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

export const SummaryLabel = styled.span`
  color: ${({ theme }) => theme.colors.text4};
  margin-right: ${({ theme }) => theme.spacing[1]};
`

export const InsightBar = styled.div`
  margin-top: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
`

export const InsightItem = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

export const InsightTitle = styled.div`
  font-size: 0.6rem;
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
`

export const ErrorMsg = styled.div`
  padding: 24px;
  text-align: center;
  font-size: 0.75rem;
  color: ${({ theme }) => theme.colors.text3};
`
