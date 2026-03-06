import styled from 'styled-components'
import { palette } from '@/presentation/theme/tokens'
import { Badge } from './AdminShared'

export const DetailRow = styled.tr`
  background: ${({ theme }) => theme.colors.bg3};
`

export const DetailCell = styled.td`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  padding-left: ${({ theme }) => theme.spacing[8]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text3};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
`

export const ExpandButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.colors.text3};
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  padding: 0 ${({ theme }) => theme.spacing[1]};
  &:hover {
    color: ${({ theme }) => theme.colors.text};
  }
`

export const ProgressBarContainer = styled.div`
  width: 60px;
  height: 6px;
  background: ${({ theme }) => theme.colors.bg3};
  border-radius: 3px;
  overflow: hidden;
  display: inline-block;
  vertical-align: middle;
  margin-left: ${({ theme }) => theme.spacing[2]};
`

export const ProgressBarFill = styled.div<{ $pct: number; $color: string }>`
  height: 100%;
  width: ${({ $pct }) => Math.min($pct, 100)}%;
  background: ${({ $color }) => $color};
  border-radius: 3px;
  transition: width 0.3s;
`

export const ValidationSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing[4]};
`

export const ValidationItem = styled.div<{ $level: string }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[1]};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  background: ${({ $level }) =>
    $level === 'error'
      ? 'rgba(239,68,68,0.1)'
      : $level === 'warning'
        ? 'rgba(245,158,11,0.1)'
        : 'rgba(59,130,246,0.1)'};
  color: ${({ $level }) =>
    $level === 'error'
      ? palette.dangerDark
      : $level === 'warning'
        ? palette.warningDark
        : palette.blueDark};
`

export const ValidationIcon = styled.span`
  flex-shrink: 0;
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
`

export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const SummaryCard = styled.div`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[3]};
  text-align: center;
`

export const SummaryValue = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xl};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

export const SummaryLabel = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  margin-top: 2px;
`

// ─── クリック可能なバッジ ─────────────────────────────────

export const ClickableBadge = styled(Badge)<{ $clickable?: boolean }>`
  cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
  transition: opacity 0.15s;
  ${({ $clickable }) => $clickable && '&:hover { opacity: 0.7; }'}
`

// ─── インポート出所モーダル ──────────────────────────────

export const HistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
  max-height: 400px;
  overflow-y: auto;
`

export const HistoryCard = styled.div`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  padding: ${({ theme }) => theme.spacing[4]};
`

export const HistoryTimestamp = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

export const HistoryFileList = styled.ul`
  margin: 0;
  padding-left: ${({ theme }) => theme.spacing[5]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text2};
  line-height: 1.8;
`

export const HistoryFileBadge = styled.span`
  display: inline-block;
  padding: 0 ${({ theme }) => theme.spacing[2]};
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  background: ${({ theme }) => `${theme.colors.palette.primary}15`};
  color: ${({ theme }) => theme.colors.palette.primary};
  margin-left: ${({ theme }) => theme.spacing[2]};
`

export const DataVerifySection = styled.div`
  margin-top: ${({ theme }) => theme.spacing[4]};
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
`

export const DataVerifyTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

export const DataVerifyGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
`

export const DataVerifyLabel = styled.span`
  color: ${({ theme }) => theme.colors.text3};
`

export const DataVerifyValue = styled.span`
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  text-align: right;
`
