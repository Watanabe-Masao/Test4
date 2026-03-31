import styled from 'styled-components'
import { palette } from '@/presentation/theme/tokens'

// ─── Section Layout ─────────────────────────────────────

export const Section = styled.div`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
`

export const SectionTitle = styled.h2`
  font-size: ${({ theme }) => theme.typography.fontSize.body};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const HelpText = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text4};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
`

export const EmptyState = styled.div`
  text-align: center;
  padding: ${({ theme }) => theme.spacing[10]};
  color: ${({ theme }) => theme.colors.text4};
  font-size: ${({ theme }) => theme.typography.fontSize.label};
`

export const LoadingText = styled.div`
  color: ${({ theme }) => theme.colors.text3};
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  padding: ${({ theme }) => theme.spacing[4]};
  text-align: center;
`

// ─── Month Cards ────────────────────────────────────────

export const MonthCardGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
`

export const MonthCard = styled.div`
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden;
`

export const MonthCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[5]};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
`

export const MonthLabel = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`

export const MonthTitle = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.body};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
`

export const MonthBadge = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text3};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
`

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`

export const ExpandIcon = styled.span<{ $expanded: boolean }>`
  color: ${({ theme }) => theme.colors.text3};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  transition: transform 0.2s;
  transform: ${({ $expanded }) => ($expanded ? 'rotate(90deg)' : 'rotate(0deg)')};
`

export const DeleteButton = styled.button`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.palette.danger ?? palette.dangerDark};
  background: transparent;
  color: ${({ theme }) => theme.colors.palette.danger ?? palette.dangerDark};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: ${({ theme }) => theme.colors.palette.danger ?? palette.dangerDark};
    color: ${({ theme }) => theme.colors.palette.white};
  }
`

export const DetailPanel = styled.div`
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding: ${({ theme }) => theme.spacing[4]} ${({ theme }) => theme.spacing[5]};
`

export const DataTypeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: ${({ theme }) => theme.spacing[2]};
`

export const DataTypeRow = styled.div<{ $hasData: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ $hasData, theme }) =>
    $hasData ? `${theme.colors.palette.primary}08` : 'transparent'};
  border: 1px solid
    ${({ $hasData, theme }) =>
      $hasData ? `${theme.colors.palette.primary}20` : theme.colors.border};
`

export const DataTypeLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text2};
`

export const DataTypeCount = styled.span<{ $hasData: boolean }>`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ $hasData, theme }) => ($hasData ? theme.colors.palette.primary : theme.colors.text4)};
`

// ─── Raw Data Viewer ────────────────────────────────────

export const RawDataSection = styled.div`
  margin-top: ${({ theme }) => theme.spacing[4]};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  padding-top: ${({ theme }) => theme.spacing[4]};
`

export const RawDataTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

export const RawDataChipGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.spacing[1]};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

export const RawDataChip = styled.button<{ $active: boolean }>`
  padding: ${({ theme }) => theme.spacing[1]} ${({ theme }) => theme.spacing[3]};
  border: 1px solid
    ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.border)};
  background: ${({ $active, theme }) =>
    $active ? `${theme.colors.palette.primary}20` : 'transparent'};
  color: ${({ $active, theme }) => ($active ? theme.colors.palette.primary : theme.colors.text3)};
  font-size: 11px;
  border-radius: ${({ theme }) => theme.radii.pill};
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
`

export const RawDataTableWrap = styled.div`
  overflow-x: auto;
  max-height: 400px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
`

export const RawTable = styled.table`
  width: max-content;
  min-width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 11px;
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

// ─── Confirm Dialog ─────────────────────────────────────

export const ConfirmOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${({ theme }) => theme.zIndex.modal};
`

export const ConfirmDialog = styled.div`
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
  padding: ${({ theme }) => theme.spacing[6]};
  max-width: 400px;
  width: 90%;
`

export const ConfirmTitle = styled.h3`
  font-size: ${({ theme }) => theme.typography.fontSize.body};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

export const ConfirmMessage = styled.p`
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  color: ${({ theme }) => theme.colors.text3};
  margin-bottom: ${({ theme }) => theme.spacing[5]};
`

export const ConfirmActions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.spacing[3]};
`

export const CancelButton = styled.button`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: transparent;
  color: ${({ theme }) => theme.colors.text2};
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors.bg3};
  }
`

export const ConfirmDeleteButton = styled.button`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  border: none;
  background: ${({ theme }) => theme.colors.palette.danger ?? palette.dangerDark};
  color: ${({ theme }) => theme.colors.palette.white};
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  &:hover {
    opacity: 0.9;
  }
`

export const ConfirmDetail = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text3};
  background: ${({ theme }) => theme.colors.bg3};
  padding: ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.md};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[1]};
`

export const ConfirmDetailRow = styled.div`
  display: flex;
  justify-content: space-between;
`

export const ConfirmWarning = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.palette.danger ?? palette.dangerDark};
  margin-bottom: ${({ theme }) => theme.spacing[3]};
`

// ─── Governance Summary ─────────────────────────────────

export const GovernanceSummary = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  margin-bottom: ${({ theme }) => theme.spacing[6]};
  padding: ${({ theme }) => theme.spacing[5]};
  background: ${({ theme }) => theme.colors.bg3};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.lg};
`

export const GovernanceRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
`

export const GovernanceIcon = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ theme }) => theme.colors.palette.success};
`

export const GovernanceText = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text3};
  line-height: 1.5;
`

export const GovernanceStat = styled.div`
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.spacing[2]};
`

export const GovernanceStatValue = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.title};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text};
`

export const GovernanceStatLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text4};
`

// ─── Storage / Backup ───────────────────────────────────

export const ProgressBarOuter = styled.div`
  width: 100%;
  height: 8px;
  background: ${({ theme }) => theme.colors.bg4};
  border-radius: ${({ theme }) => theme.radii.pill};
  overflow: hidden;
`

export const ProgressBarInner = styled.div<{
  $ratio: number
  $level: 'normal' | 'warning' | 'critical'
}>`
  height: 100%;
  width: ${({ $ratio }) => `${Math.min($ratio * 100, 100)}%`};
  background: ${({ $level, theme }) =>
    $level === 'critical'
      ? (theme.colors.palette.danger ?? palette.dangerDark)
      : $level === 'warning'
        ? (theme.colors.palette.warning ?? '#e6a700')
        : (theme.colors.palette.primary ?? '#3b82f6')};
  border-radius: ${({ theme }) => theme.radii.pill};
  transition: width 0.3s;
`

export const ActionButton = styled.button<{ $variant?: 'primary' | 'danger' | 'default' }>`
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  border: 1px solid
    ${({ $variant, theme }) =>
      $variant === 'danger'
        ? (theme.colors.palette.danger ?? palette.dangerDark)
        : $variant === 'primary'
          ? (theme.colors.palette.primary ?? '#3b82f6')
          : theme.colors.border};
  background: ${({ $variant, theme }) =>
    $variant === 'primary'
      ? (theme.colors.palette.primary ?? '#3b82f6')
      : $variant === 'danger'
        ? 'transparent'
        : 'transparent'};
  color: ${({ $variant, theme }) =>
    $variant === 'primary'
      ? theme.colors.palette.white
      : $variant === 'danger'
        ? (theme.colors.palette.danger ?? palette.dangerDark)
        : theme.colors.text2};
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    opacity: 0.85;
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export const StatusRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing[3]};
`

export const StatusLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text3};
`

export const StatusValue = styled.span<{ $highlight?: boolean }>`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ $highlight, theme }) =>
    $highlight ? theme.colors.palette.primary : theme.colors.text};
`

export const SubSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
`

export const FileInputLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[4]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.typography.fontSize.label};
  color: ${({ theme }) => theme.colors.text2};
  cursor: pointer;
  &:hover {
    background: ${({ theme }) => theme.colors.bg3};
  }
`

export const ImportResultBox = styled.div<{ $hasErrors: boolean }>`
  padding: ${({ theme }) => theme.spacing[3]};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  background: ${({ $hasErrors, theme }) =>
    $hasErrors
      ? `${theme.colors.palette.danger ?? palette.dangerDark}10`
      : `${theme.colors.palette.success ?? '#22c55e'}10`};
  border: 1px solid
    ${({ $hasErrors, theme }) =>
      $hasErrors
        ? `${theme.colors.palette.danger ?? palette.dangerDark}30`
        : `${theme.colors.palette.success ?? '#22c55e'}30`};
  color: ${({ theme }) => theme.colors.text2};
`

// ─── Sync ───────────────────────────────────────────────

export const SyncCodeTextArea = styled.textarea`
  width: 100%;
  min-height: 60px;
  padding: ${({ theme }) => theme.spacing[3]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bg3};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  resize: vertical;
  word-break: break-all;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }

  &::placeholder {
    color: ${({ theme }) => theme.colors.text4};
  }
`

export const SyncRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[3]};
  flex-wrap: wrap;
`
