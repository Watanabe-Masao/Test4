import type { ImportProgress } from '@/application/hooks/useImport'
import type { ImportSummary, FileImportResult } from '@/domain/models/ImportResult'
import {
  Container,
  StepTrack,
  StepDot,
  StepLine,
  StepLabel,
  StepItem,
  ProgressSection,
  ProgressTrack,
  ProgressFill,
  ProgressText,
  FileInfo,
  SummaryCard,
  SummaryTitle,
  SummaryStats,
  StatBadge,
  FileList,
  FileRow,
  FileIcon,
  FileType,
  RecordCountBadge,
  SkippedInfo,
  WarningInfo,
} from './ImportWizard.styles'

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

// ─── ステップインジケーター ───────────────────────────
function StepIndicator({ stage }: { stage: ImportStage }) {
  return (
    <StepTrack>
      {STAGE_ORDER.map((s, i) => {
        const idx = STAGE_ORDER.indexOf(stage)
        const state: 'pending' | 'active' | 'done' =
          STAGE_ORDER.indexOf(s) < idx ? 'done' : s === stage ? 'active' : 'pending'

        return (
          <StepItem key={s} style={{ flex: i < STAGE_ORDER.length - 1 ? 1 : undefined }}>
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <StepDot $state={state} />
              {i < STAGE_ORDER.length - 1 && <StepLine $done={STAGE_ORDER.indexOf(s) < idx} />}
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
            <span>
              {progress.current}/{progress.total}
            </span>
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
  const totalRecords = summary.results.reduce(
    (sum, r) => sum + (r.ok && r.rowCount ? r.rowCount : 0),
    0,
  )

  return (
    <SummaryCard>
      <SummaryTitle>
        <span>インポート結果</span>
        <SummaryStats>
          {successes.length > 0 && (
            <StatBadge $variant="success">{successes.length} 成功</StatBadge>
          )}
          {failures.length > 0 && <StatBadge $variant="error">{failures.length} 失敗</StatBadge>}
          {totalRecords > 0 && (
            <RecordCountBadge>{totalRecords.toLocaleString()}件</RecordCountBadge>
          )}
        </SummaryStats>
      </SummaryTitle>

      <FileList>
        {summary.results.map((r: FileImportResult, i: number) => (
          <FileRow key={i} $ok={r.ok}>
            <FileIcon $ok={r.ok}>{r.ok ? '✓' : '✕'}</FileIcon>
            <span
              style={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {r.filename}
            </span>
            {r.typeName && <FileType>{r.typeName}</FileType>}
            {r.rowCount != null && (
              <span style={{ flexShrink: 0, opacity: 0.6 }}>{r.rowCount}行</span>
            )}
            {!r.ok && r.error && (
              <span
                style={{
                  color: 'inherit',
                  flexShrink: 0,
                  maxWidth: 120,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {r.error}
              </span>
            )}
          </FileRow>
        ))}
      </FileList>

      {/* スキップ行・警告の詳細表示 */}
      {summary.results.map((r: FileImportResult, i: number) => {
        const hasSkipped = r.skippedRows && r.skippedRows.length > 0
        const hasWarnings = r.warnings && r.warnings.length > 0
        if (!hasSkipped && !hasWarnings) return null
        return (
          <div key={`detail-${i}`}>
            {hasSkipped && (
              <SkippedInfo>
                {r.typeName ?? r.filename}: {r.skippedRows!.length}行スキップ
              </SkippedInfo>
            )}
            {hasWarnings &&
              r.warnings!.map((w, wi) => (
                <WarningInfo key={wi}>
                  {r.typeName ?? r.filename}: {w}
                </WarningInfo>
              ))}
          </div>
        )
      })}

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
