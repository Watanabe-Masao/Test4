import styled, { keyframes } from 'styled-components'
import type { ImportProgress } from '@/application/hooks/useImport'
import type { ImportSummary, FileImportResult } from '@/application/services/FileImportService'

// ─── Types ────────────────────────────────────────────
export type ImportStage = 'idle' | 'reading' | 'validating' | 'saving' | 'done'

const STAGE_LABELS: Record<ImportStage, string> = {
  idle: '待機中',
  reading: 'ファイル解析中',
  validating: 'データ検証中',
  saving: '保存中',
  done: '完了',
}

const STAGE_ORDER: ImportStage[] = ['reading', 'validating', 'saving', 'done']

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
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[4]};
  animation: ${slideDown} 0.3s ease;
`

const StepTrack = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[1]};
  padding: ${({ theme }) => theme.spacing[2]} 0;
`

const StepDot = styled.div<{ $state: 'pending' | 'active' | 'done' }>`
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
    `animation: ${pulse} 1.2s ease-in-out infinite;`}
`

const StepLine = styled.div<{ $done: boolean }>`
  flex: 1;
  height: 2px;
  background: ${({ $done, theme }) =>
    $done ? theme.colors.palette.success : theme.colors.bg4};
  transition: background 0.3s ease;
`

const StepLabel = styled.div<{ $state: 'pending' | 'active' | 'done' }>`
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

const StepItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  min-width: 48px;
`

const ProgressSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[2]};
`

const ProgressTrack = styled.div`
  width: 100%;
  height: 6px;
  background: ${({ theme }) => theme.colors.bg4};
  border-radius: ${({ theme }) => theme.radii.pill};
  overflow: hidden;
`

const ProgressFill = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${({ $percent }) => $percent}%;
  background: ${({ theme }) => theme.colors.palette.primary};
  border-radius: ${({ theme }) => theme.radii.pill};
  transition: width 0.2s ease;
`

const ProgressText = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text3};
  display: flex;
  justify-content: space-between;
`

const FileInfo = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
`

// ─── サマリーカード ───────────────────────────────────
const SummaryCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing[3]};
  padding: ${({ theme }) => theme.spacing[4]};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
`

const SummaryTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
`

const SummaryStats = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing[4]};
`

const StatBadge = styled.span<{ $variant: 'success' | 'error' | 'skip' }>`
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

const FileList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 120px;
  overflow-y: auto;
`

const FileRow = styled.div<{ $ok: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  font-size: 0.65rem;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ $ok, theme }) => ($ok ? theme.colors.text3 : theme.colors.palette.danger)};
  padding: 2px 0;
`

const FileIcon = styled.span<{ $ok: boolean }>`
  font-size: 0.6rem;
  color: ${({ $ok, theme }) => ($ok ? theme.colors.palette.success : theme.colors.palette.danger)};
`

const FileType = styled.span`
  flex-shrink: 0;
  font-size: 0.55rem;
  padding: 0 4px;
  border-radius: 2px;
  background: ${({ theme }) => theme.colors.bg4};
  color: ${({ theme }) => theme.colors.text4};
`

// ─── ステップインジケーター ───────────────────────────
function StepIndicator({ stage }: { stage: ImportStage }) {
  return (
    <StepTrack>
      {STAGE_ORDER.map((s, i) => {
        const idx = STAGE_ORDER.indexOf(stage)
        const state: 'pending' | 'active' | 'done' =
          STAGE_ORDER.indexOf(s) < idx ? 'done'
            : s === stage ? 'active'
              : 'pending'

        return (
          <StepItem key={s} style={{ flex: i < STAGE_ORDER.length - 1 ? 1 : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <StepDot $state={state} />
              {i < STAGE_ORDER.length - 1 && (
                <StepLine $done={STAGE_ORDER.indexOf(s) < idx} />
              )}
            </div>
            <StepLabel $state={state}>{STAGE_LABELS[s]}</StepLabel>
          </StepItem>
        )
      })}
    </StepTrack>
  )
}

// ─── エクスポート: インポートプログレス ─────────────────
export function ImportProgress({
  progress,
  stage,
}: {
  progress: ImportProgress | null
  stage: ImportStage
}) {
  if (stage === 'idle') return null

  const percent = progress ? Math.round((progress.current / progress.total) * 100) : 0

  return (
    <Container>
      <StepIndicator stage={stage} />
      {progress && stage === 'reading' && (
        <ProgressSection>
          <ProgressTrack>
            <ProgressFill $percent={percent} />
          </ProgressTrack>
          <ProgressText>
            <FileInfo>{progress.filename}</FileInfo>
            <span>{progress.current}/{progress.total}</span>
          </ProgressText>
        </ProgressSection>
      )}
    </Container>
  )
}

// ─── エクスポート: インポートサマリー ───────────────────
export function ImportSummaryCard({
  summary,
  onDismiss,
}: {
  summary: ImportSummary
  onDismiss: () => void
}) {
  const successes = summary.results.filter((r) => r.ok)
  const failures = summary.results.filter((r) => !r.ok)

  return (
    <SummaryCard>
      <SummaryTitle>
        <span>インポート結果</span>
        <SummaryStats>
          {successes.length > 0 && (
            <StatBadge $variant="success">{successes.length} 成功</StatBadge>
          )}
          {failures.length > 0 && (
            <StatBadge $variant="error">{failures.length} 失敗</StatBadge>
          )}
        </SummaryStats>
      </SummaryTitle>

      <FileList>
        {summary.results.map((r: FileImportResult, i: number) => (
          <FileRow key={i} $ok={r.ok}>
            <FileIcon $ok={r.ok}>{r.ok ? '✓' : '✕'}</FileIcon>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.filename}
            </span>
            {r.typeName && <FileType>{r.typeName}</FileType>}
            {r.rowCount != null && (
              <span style={{ flexShrink: 0, opacity: 0.6 }}>{r.rowCount}行</span>
            )}
            {!r.ok && r.error && (
              <span style={{ color: 'inherit', flexShrink: 0, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {r.error}
              </span>
            )}
          </FileRow>
        ))}
      </FileList>

      <button
        onClick={onDismiss}
        style={{
          all: 'unset',
          cursor: 'pointer',
          textAlign: 'center',
          fontSize: '0.65rem',
          color: 'inherit',
          opacity: 0.5,
        }}
      >
        閉じる
      </button>
    </SummaryCard>
  )
}
