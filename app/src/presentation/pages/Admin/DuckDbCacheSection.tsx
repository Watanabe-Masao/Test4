/**
 * DuckDB キャッシュ管理セクション — 再構築 + 原本ファイル表示
 */
import type { RawFileGroup } from '@/application/hooks/data'
import {
  Section,
  SectionTitle,
  HelpText,
  SubSection,
  StatusRow,
  StatusLabel,
  StatusValue,
  ActionButton,
  ImportResultBox,
} from './StorageManagementTab.styles'

interface RebuildResult {
  readonly monthCount: number
  readonly durationMs: number
  readonly skippedMonths: readonly { year: number; month: number }[]
}

interface Props {
  readonly canRebuild: boolean
  readonly isRebuilding: boolean
  readonly lastRebuildResult: RebuildResult | null
  readonly rawFileGroups: readonly RawFileGroup[]
  readonly onRebuild: () => void
}

export function DuckDbCacheSection({
  canRebuild,
  isRebuilding,
  lastRebuildResult,
  rawFileGroups,
  onRebuild,
}: Props) {
  return (
    <Section>
      <SectionTitle>DuckDB キャッシュ管理</SectionTitle>
      <HelpText>
        DuckDB のインメモリ/OPFS
        キャッシュを再構築します。データの不整合が疑われる場合に使用してください。
      </HelpText>
      <SubSection>
        <StatusRow>
          <ActionButton
            $variant="primary"
            onClick={onRebuild}
            disabled={!canRebuild || isRebuilding}
          >
            {isRebuilding ? '再構築中...' : 'DuckDB を再構築'}
          </ActionButton>
        </StatusRow>
        {lastRebuildResult && (
          <ImportResultBox $hasErrors={lastRebuildResult.skippedMonths.length > 0}>
            <div>
              再構築完了: {lastRebuildResult.monthCount} 月分（
              {lastRebuildResult.durationMs.toFixed(0)}ms）
            </div>
            {lastRebuildResult.skippedMonths.length > 0 && (
              <div>
                スキップ:{' '}
                {lastRebuildResult.skippedMonths.map((s) => `${s.year}-${s.month}`).join(', ')}
              </div>
            )}
          </ImportResultBox>
        )}
        {rawFileGroups.length > 0 && (
          <SubSection>
            <StatusLabel>保存済み原本ファイル</StatusLabel>
            {rawFileGroups.map((g) => (
              <StatusRow key={`${g.year}-${g.month}`}>
                <StatusLabel>
                  {g.year}年{g.month}月
                </StatusLabel>
                <StatusValue>{g.files.map((f) => f.dataType).join(', ')}</StatusValue>
              </StatusRow>
            ))}
          </SubSection>
        )}
      </SubSection>
    </Section>
  )
}
