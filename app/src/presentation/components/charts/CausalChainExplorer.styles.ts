import styled from 'styled-components'

export const Wrapper = styled.div`
  width: 100%;
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
`

export const Title = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const StepContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`

export const StepCard = styled.div<{ $active: boolean }>`
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  border-left: 4px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${({ $active, theme }) =>
    $active
      ? theme.mode === 'dark' ? `${theme.colors.palette.primary}14` : `${theme.colors.palette.primary}0a`
      : theme.colors.bg2};
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

export const StepHeader = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
`

export const StepNum = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.palette.white};
  background: ${({ $color }) => $color};
`

export const StepTitle = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`

export const StepBody = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  color: ${({ theme }) => theme.colors.text3};
  line-height: 1.5;
`

export const FactorBar = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-top: ${({ theme }) => theme.spacing[2]};
  flex-wrap: wrap;
`

export const Factor = styled.div<{ $color: string; $isMax: boolean }>`
  flex: 1;
  min-width: 100px;
  padding: ${({ theme }) => theme.spacing[2]};
  background: ${({ $color }) => $color}${({ $isMax }) => ($isMax ? '18' : '08')};
  border: 1px solid ${({ $color }) => $color}${({ $isMax }) => ($isMax ? '50' : '20')};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
`

export const FactorLabel = styled.div`
  color: ${({ theme }) => theme.colors.text4};
  margin-bottom: 2px;
`

export const FactorValue = styled.div`
  font-weight: 700;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text};
`

export const Arrow = styled.div`
  text-align: center;
  color: ${({ theme }) => theme.colors.text4};
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  padding: 2px 0;
`

export const InsightBox = styled.div<{ $color: string }>`
  margin-top: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ $color }) => $color}0a;
  border: 1px solid ${({ $color }) => $color}30;
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  color: ${({ theme }) => theme.colors.text2};
  line-height: 1.6;
`

export const DrillLink = styled.button`
  all: unset;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-top: ${({ theme }) => theme.spacing[1]};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.palette.primary};
  &:hover {
    text-decoration: underline;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`
