import styled from 'styled-components'
import { palette } from '@/presentation/theme/tokens'

export const Section = styled.div`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
`

export const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.base};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const HelpText = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const FieldGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

export const FieldRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
`

export const FieldLabel = styled.label`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  min-width: 160px;
`

export const Select = styled.select`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bg3};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  cursor: pointer;
  min-width: 200px;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

export const Badge = styled.span<{ $color?: string }>`
  display: inline-block;
  padding: 2px ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.pill};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.medium};
  background: ${({ $color }) => ($color ? `${$color}20` : 'rgba(255,255,255,0.1)')};
  color: ${({ $color, theme }) => $color ?? theme.colors.text3};
`

export const CurrentStatus = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const StatusItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

export const StatusLabel = styled.span`
  font-size: 11px;
  color: ${({ theme }) => theme.colors.text4};
`

export const StatusValue = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

export const ActionRow = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-top: ${({ theme }) => theme.spacing[4]};
`

export const PrimaryButton = styled.button`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[5]};
  border: none;
  background: ${({ theme }) => theme.colors.palette.primary};
  color: ${({ theme }) => theme.colors.palette.white};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  transition: opacity 0.15s;
  &:hover {
    opacity: 0.9;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export const SecondaryButton = styled.button`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[5]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: transparent;
  color: ${({ theme }) => theme.colors.text2};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors.bg3};
  }
`

export const PreviewGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  font-size: 11px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

export const DowHeader = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[1]};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text3};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

export const DayCell = styled.div<{ $mapped: boolean; $isWeekend: boolean; $hasData?: boolean }>`
  text-align: center;
  padding: 4px 2px;
  border-radius: 3px;
  background: ${({ $mapped, $hasData }) =>
    !$mapped ? 'transparent' : $hasData ? `${palette.successDark}12` : `${palette.dangerDark}08`};
  color: ${({ $isWeekend, theme }) => ($isWeekend ? palette.dangerDark : theme.colors.text)};
  border: 1px solid
    ${({ $mapped, $hasData, theme }) =>
      !$mapped ? 'transparent' : $hasData ? `${palette.successDark}30` : `${theme.colors.border}`};
`

export const MappingArrow = styled.div`
  font-size: 10px;
  color: ${({ theme }) => theme.colors.text4};
  line-height: 1;
`

export const PrevDayLabel = styled.div<{ $isOverflow?: boolean }>`
  font-size: 10px;
  opacity: ${({ $isOverflow }) => ($isOverflow ? 0.8 : 0.6)};
  color: ${({ $isOverflow }) => ($isOverflow ? palette.warningDark : 'inherit')};
`

export const DataStatus = styled.div<{ $hasData: boolean }>`
  font-size: 10px;
  line-height: 1.2;
`

export const MappingSummary = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
`

export const SummaryItem = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text2};
`
