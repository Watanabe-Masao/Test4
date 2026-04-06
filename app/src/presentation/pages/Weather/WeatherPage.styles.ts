/**
 * WeatherPage — styled components
 *
 * WeatherPage.tsx の行数制限（R12: 600行）対応のためスタイルを分離。
 * デザインシステム準拠: font-size は theme.typography.fontSize.* を使用。
 */
import styled, { keyframes } from 'styled-components'
import { motion } from 'framer-motion'
import { sc } from '@/presentation/theme/semanticColors'

export const Page = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing[4]};
`

export const Header = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  flex-wrap: wrap;
`

export const PageTitle = styled.h1`
  font-size: ${({ theme }) => theme.typography.fontSize.heading};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  display: flex;
  align-items: center;
  gap: 8px;
`

export const Controls = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[2]};
  align-items: center;
  flex-wrap: wrap;
  margin-left: auto;
`

export const Select = styled.select`
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.fontSize.body};
`

export const NavBtn = styled.button`
  padding: 6px 14px;
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bg2};
  color: ${({ theme }) => theme.colors.text};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.body};
  transition: all 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.bg3};
    transform: translateY(-1px);
  }
  &:active {
    transform: translateY(0);
  }
`

export const MonthLabel = styled.span`
  font-weight: 700;
  font-size: ${({ theme }) => theme.typography.fontSize.title};
  min-width: 100px;
  text-align: center;
`

export const SectionLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.body};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
  display: flex;
  align-items: center;
  gap: 6px;
`

export const Grid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(68px, 1fr));
  gap: ${({ theme }) => theme.spacing[1]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const DayCell = styled(motion.div)<{ $active?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 4px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bg2};
  cursor: pointer;
  transition: all 0.15s;
  ${({ $active, theme }) =>
    $active
      ? `outline: 2px solid ${theme.colors.palette.primary}; background: ${theme.colors.bg3};`
      : `&:hover { background: ${theme.colors.bg3}; transform: translateY(-1px); }`}
`

export const ForecastCell = styled(DayCell)`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px dashed ${sc.caution};
`

export const DayLabelText = styled.span<{ $weekend?: boolean }>`
  font-size: ${({ theme }) => theme.typography.fontSize.caption};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $weekend }) => ($weekend ? sc.negative : 'inherit')};
  opacity: 0.7;
`

export const SummaryGrid = styled(motion.div)`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const SummaryCard = styled(motion.div)<{ $accent?: string }>`
  padding: ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bg2};
  text-align: center;
  border-top: 3px solid ${({ $accent }) => $accent ?? 'transparent'};
  transition: transform 0.15s;
  &:hover {
    transform: translateY(-2px);
  }
`

export const SummaryValue = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.display};
  font-weight: 700;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text};
`

export const SummaryUnit = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: 400;
  opacity: 0.6;
`

export const SummaryCaption = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text3};
  margin-top: 4px;
`

export const TableWrapper = styled.div`
  overflow-x: auto;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const DetailTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.fontSize.label};

  th,
  td {
    padding: 7px 10px;
    text-align: right;
    white-space: nowrap;
  }
  th {
    text-align: left;
    font-weight: 600;
    color: ${({ theme }) => theme.colors.text3};
    background: ${({ theme }) => theme.colors.bg2};
    position: sticky;
    top: 0;
  }
  td:first-child {
    text-align: left;
    font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  }
  tbody tr {
    transition: background 0.1s;
    &:hover {
      background: ${({ theme }) => theme.colors.bg2};
    }
  }
  tbody tr:not(:last-child) td {
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }
`

export const PrecipBar = styled.div<{ $pct: number }>`
  display: inline-block;
  width: ${({ $pct }) => Math.max($pct, 2)}px;
  max-width: 60px;
  height: 10px;
  background: ${sc.positive}40;
  border-radius: 2px;
  margin-right: 4px;
  vertical-align: middle;
`

export const SetupBox = styled(motion.div)`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[8]};
  color: ${({ theme }) => theme.colors.text3};
`

export const SetupSection = styled.div`
  max-width: 400px;
  margin: 0 auto;
  text-align: left;
`

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`

export const Spinner = styled.div`
  display: inline-block;
  width: 24px;
  height: 24px;
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-top-color: ${({ theme }) => theme.colors.palette.primary};
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`

export const LoadingBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: ${({ theme }) => theme.spacing[8]};
  color: ${({ theme }) => theme.colors.text3};
  font-size: ${({ theme }) => theme.typography.fontSize.body};
`

export const ErrorText = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[4]};
  color: ${sc.negative};
  font-size: ${({ theme }) => theme.typography.fontSize.body};
`

export const StationBadge = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  padding: 2px 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.colors.bg3};
  color: ${({ theme }) => theme.colors.text3};
`
