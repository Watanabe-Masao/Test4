/**
 * ストレージ状態セクション — 使用量・永続化・OPFS 表示
 *
 * @responsibility R:unclassified
 */
import type { StorageStatusInfo } from '@/application/hooks/useStoragePersistence'
import {
  Section,
  SectionTitle,
  HelpText,
  LoadingText,
  SubSection,
  StatusRow,
  StatusLabel,
  StatusValue,
  ProgressBarOuter,
  ProgressBarInner,
  ActionButton,
  ImportResultBox,
} from './StorageManagementTab.styles'

interface Props {
  readonly status: StorageStatusInfo
  readonly isLoading: boolean
  readonly onRequestPersistence: () => void
}

export function StorageStatusSection({ status, isLoading, onRequestPersistence }: Props) {
  return (
    <Section>
      <SectionTitle>ストレージ状態</SectionTitle>
      <HelpText>
        ブラウザのストレージ使用状況と永続化設定です。永続化すると、ブラウザがストレージを自動削除するリスクを低減できます。
      </HelpText>
      {isLoading ? (
        <LoadingText>読み込み中...</LoadingText>
      ) : (
        <SubSection>
          <StatusRow>
            <StatusLabel>使用量</StatusLabel>
            <StatusValue>
              {status.usageFormatted} / {status.quotaFormatted}
            </StatusValue>
          </StatusRow>
          <ProgressBarOuter>
            <ProgressBarInner $ratio={status.usageRatio} $level={status.pressureLevel} />
          </ProgressBarOuter>
          <StatusRow>
            <StatusLabel>永続化</StatusLabel>
            <StatusValue $highlight={status.isPersisted}>
              {status.isPersisted ? '有効' : '無効'}
            </StatusValue>
          </StatusRow>
          <StatusRow>
            <StatusLabel>OPFS</StatusLabel>
            <StatusValue $highlight={status.isOpfsAvailable}>
              {status.isOpfsAvailable ? '利用可能' : '利用不可'}
            </StatusValue>
          </StatusRow>
          {status.pressureLevel !== 'normal' && (
            <ImportResultBox $hasErrors>
              {status.pressureLevel === 'critical'
                ? 'ストレージ容量が危険水準です。不要なデータを削除してください。'
                : 'ストレージ容量が警告水準に達しています。'}
            </ImportResultBox>
          )}
          {!status.isPersisted && (
            <ActionButton $variant="primary" onClick={onRequestPersistence}>
              ストレージを永続化する
            </ActionButton>
          )}
        </SubSection>
      )}
    </Section>
  )
}
