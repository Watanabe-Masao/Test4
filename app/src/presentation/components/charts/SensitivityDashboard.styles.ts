import styled from 'styled-components'
import { sc } from '@/presentation/theme/semanticColors'
import { palette } from '@/presentation/theme/tokens'

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

export const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[4]};

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`

export const SliderSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`

export const SliderCard = styled.div`
  padding: ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
`

export const SliderHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
`

export const SliderLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text2};
`

export const SliderValue = styled.div<{ $positive: boolean; $isZero: boolean }>`
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: 700;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $isZero, $positive }) => ($isZero ? '#94a3b8' : sc.cond($positive))};
`

export const BaseValueRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text4};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

export const BaseLabel = styled.span`
  color: ${({ theme }) => theme.colors.text3};
`

export const SimLabel = styled.span<{ $changed: boolean }>`
  color: ${({ $changed }) => ($changed ? palette.primary : 'inherit')};
  font-weight: ${({ $changed }) => ($changed ? 600 : 400)};
`

export const StyledSlider = styled.input`
  width: 100%;
  height: 4px;
  border-radius: 2px;
  appearance: none;
  background: ${({ theme }) => theme.colors.border};
  outline: none;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${({ theme }) => theme.colors.palette.primary};
    cursor: pointer;
  }
`

export const ElasticityBadge = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text4};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  margin-top: 2px;
`

export const ResultSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`

export const ResultCard = styled.div<{ $color: string }>`
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-left: 4px solid ${({ $color }) => $color};
  border-radius: ${({ theme }) => theme.radii.md};
`

export const ResultLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  color: ${({ theme }) => theme.colors.text4};
  margin-bottom: 2px;
`

export const ResultRow = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.spacing[2]};
`

export const ResultValue = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.title};
  font-weight: 700;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text};
`

export const ResultDelta = styled.div<{ $positive: boolean; $isZero: boolean }>`
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  font-weight: 600;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $isZero, $positive }) => ($isZero ? '#94a3b8' : sc.cond($positive))};
`

export const Formula = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text4};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  margin-top: 4px;
  line-height: 1.5;
  padding: 4px 6px;
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'};
  border-radius: ${({ theme }) => theme.radii.sm};
`

export const ResetBtn = styled.button`
  all: unset;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text3};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  &:hover {
    opacity: 0.8;
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
    border-radius: ${({ theme }) => theme.radii.sm};
  }
`

export const ActionBtn = styled.button<{ $variant?: 'primary' | 'default' }>`
  all: unset;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  padding: 4px 10px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ $variant, theme }) =>
    $variant === 'primary' ? theme.colors.palette.primary : theme.colors.text3};
  background: ${({ $variant, theme }) =>
    $variant === 'primary'
      ? theme.mode === 'dark'
        ? 'rgba(99,102,241,0.15)'
        : 'rgba(99,102,241,0.08)'
      : theme.mode === 'dark'
        ? 'rgba(255,255,255,0.06)'
        : 'rgba(0,0,0,0.04)'};
  border: 1px solid
    ${({ $variant }) => ($variant === 'primary' ? 'rgba(99,102,241,0.3)' : 'transparent')};
  &:hover {
    opacity: 0.8;
  }
`

// -- Scenario comparison --

export const ScenarioSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing[4]};
  padding-top: ${({ theme }) => theme.spacing[3]};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`

export const ScenarioTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

export const ScenarioTh = styled.th`
  text-align: center;
  padding: 4px 6px;
  border-bottom: 2px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text3};
  font-weight: 600;
  white-space: nowrap;
`

export const ScenarioTd = styled.td<{ $highlight?: boolean }>`
  text-align: center;
  padding: 4px 6px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme, $highlight }) => ($highlight ? theme.colors.text : theme.colors.text3)};
  font-weight: ${({ $highlight }) => ($highlight ? 600 : 400)};
  white-space: nowrap;
`

export const ScenarioName = styled.td`
  text-align: left;
  padding: 4px 6px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text2};
  font-weight: 600;
`

export const DeleteBtn = styled.button`
  all: unset;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text4};
  padding: 1px 4px;
  border-radius: 2px;
  &:hover {
    color: ${({ theme }) => theme.colors.text};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'};
  }
`

export const LoadBtn = styled.button`
  all: unset;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.palette.primary};
  padding: 1px 4px;
  border-radius: 2px;
  &:hover {
    text-decoration: underline;
  }
`
