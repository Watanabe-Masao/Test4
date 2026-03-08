import styled, { css, keyframes } from 'styled-components'

// ─── Animations ───────────────────────────────────────
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`

const slideDown = keyframes`
  from { opacity: 0; max-height: 0; }
  to { opacity: 1; max-height: 400px; }
`

// ─── Styled Components ────────────────────────────────
export const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
  animation: ${slideDown} 0.3s ease;
`

export const StepTrack = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => theme.spacing[2]} 0;
`

export const StepDot = styled.div<{ $state: 'pending' | 'active' | 'done' }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ $state, theme }) =>
    $state === 'done'
      ? theme.colors.palette.success
      : $state === 'active'
        ? theme.colors.palette.primary
        : theme.colors.bg4};
  ${({ $state }) =>
    $state === 'active' &&
    css`
      animation: ${pulse} 1.2s ease-in-out infinite;
    `}
`

export const StepLine = styled.div<{ $done: boolean }>`
  flex: 1;
  height: 2px;
  background: ${({ $done, theme }) => ($done ? theme.colors.palette.success : theme.colors.bg4)};
  transition: background 0.3s ease;
`

export const StepLabel = styled.div<{ $state: 'pending' | 'active' | 'done' }>`
  font-size: 0.6rem;
  color: ${({ $state, theme }) =>
    $state === 'active'
      ? theme.colors.palette.primary
      : $state === 'done'
        ? theme.colors.palette.success
        : theme.colors.text4};
  white-space: nowrap;
  font-weight: ${({ $state }) => ($state === 'active' ? '600' : '400')};
`

export const StepItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 48px;
`

export const ProgressSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`

export const ProgressTrack = styled.div`
  width: 100%;
  height: 6px;
  background: ${({ theme }) => theme.colors.bg4};
  border-radius: ${({ theme }) => theme.radii.pill};
  overflow: hidden;
`

export const ProgressFill = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${({ $percent }) => $percent}%;
  background: ${({ theme }) => theme.colors.palette.primary};
  border-radius: ${({ theme }) => theme.radii.pill};
  transition: width 0.2s ease;
`

export const ProgressText = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  display: flex;
  justify-content: space-between;
`

export const FileInfo = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
`

// ─── サマリーカード ───────────────────────────────────
export const SummaryCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
`

export const SummaryTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`

export const SummaryStats = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
`

export const StatBadge = styled.span<{ $variant: 'success' | 'error' | 'skip' }>`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  padding: 1px 6px;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ $variant, theme }) =>
    $variant === 'success'
      ? `${theme.colors.palette.success}18`
      : $variant === 'error'
        ? `${theme.colors.palette.danger}18`
        : `${theme.colors.palette.primary}18`};
  color: ${({ $variant, theme }) =>
    $variant === 'success'
      ? theme.colors.palette.success
      : $variant === 'error'
        ? theme.colors.palette.danger
        : theme.colors.text3};
`

export const FileList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 120px;
  overflow-y: auto;
`

export const FileRow = styled.div<{ $ok: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: 0.65rem;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $ok, theme }) => ($ok ? theme.colors.text3 : theme.colors.palette.danger)};
  padding: 2px 0;
`

export const FileIcon = styled.span<{ $ok: boolean }>`
  font-size: 0.6rem;
  color: ${({ $ok, theme }) => ($ok ? theme.colors.palette.success : theme.colors.palette.danger)};
`

export const FileType = styled.span`
  flex-shrink: 0;
  font-size: 0.55rem;
  padding: 0 4px;
  border-radius: 2px;
  background: ${({ theme }) => theme.colors.bg4};
  color: ${({ theme }) => theme.colors.text4};
`

// ─── 拡張サマリー用スタイル ────────────────────────────
export const RecordCountBadge = styled.span`
  font-size: 0.55rem;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.palette.primary};
  background: ${({ theme }) => theme.colors.palette.primary}12;
  padding: 1px 5px;
  border-radius: ${({ theme }) => theme.radii.sm};
`

export const SkippedInfo = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
  padding: 2px 0;
`

export const WarningInfo = styled.div`
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.palette.warning};
  padding: 2px 0;
`
