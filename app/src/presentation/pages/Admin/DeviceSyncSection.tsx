/**
 * デバイス間同期セクション — 設定コード転送 + Web Share API
 */
import { useState } from 'react'
import { useSettingsStore } from '@/application/stores/settingsStore'
import type { SettingsImportResult } from '@/application/hooks/useDeviceSync'
import type { DataRepository } from '@/domain/repositories'
import {
  Section,
  SectionTitle,
  HelpText,
  SubSection,
  StatusLabel,
  SyncRow,
  SyncCodeTextArea,
  ActionButton,
  ImportResultBox,
} from './StorageManagementTab.styles'

interface Props {
  readonly isCopied: boolean
  readonly syncImportResult: SettingsImportResult | null
  readonly canShareFiles: boolean
  readonly repo: DataRepository | null
  readonly onCopySettingsCode: () => void
  readonly onImportFromText: (text: string) => void
  readonly onShareBackupFile: (blob: Blob) => Promise<boolean>
}

export function DeviceSyncSection({
  isCopied,
  syncImportResult,
  canShareFiles,
  repo,
  onCopySettingsCode,
  onImportFromText,
  onShareBackupFile,
}: Props) {
  const [importText, setImportText] = useState('')
  const [isShareExporting, setIsShareExporting] = useState(false)

  return (
    <Section>
      <SectionTitle>デバイス間同期</SectionTitle>
      <HelpText>
        PC とスマートフォン間で設定やデータを共有できます。Chrome
        のブラウザ同期ではアプリのデータは同期されないため、手動で転送してください。
      </HelpText>

      <SubSection>
        <StatusLabel>設定の転送（カテゴリ分類・閾値など）</StatusLabel>
        <SyncRow>
          <ActionButton $variant="primary" onClick={onCopySettingsCode}>
            {isCopied ? 'コピーしました' : '設定コードをコピー'}
          </ActionButton>
        </SyncRow>
        <HelpText style={{ marginBottom: 0, marginTop: 8 }}>
          コピーしたコードを LINE などで送り、別のデバイスで下のテキスト欄に貼り付けてください。
        </HelpText>

        <SyncCodeTextArea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="SHIIRE_SETTINGS:... のコードを貼り付け"
          rows={2}
        />
        <SyncRow>
          <ActionButton
            $variant="primary"
            onClick={() => {
              onImportFromText(importText)
              setImportText('')
            }}
            disabled={!importText.trim()}
          >
            設定を適用
          </ActionButton>
        </SyncRow>
        {syncImportResult && (
          <ImportResultBox $hasErrors={!syncImportResult.success}>
            {syncImportResult.success
              ? `設定を適用しました（${syncImportResult.keysUpdated ?? 0} 項目）`
              : `エラー: ${syncImportResult.error}`}
          </ImportResultBox>
        )}
      </SubSection>

      {canShareFiles && (
        <SubSection style={{ marginTop: 16 }}>
          <StatusLabel>データの転送（全月データ + 設定）</StatusLabel>
          <SyncRow>
            <ActionButton
              $variant="primary"
              disabled={isShareExporting || !repo}
              onClick={async () => {
                if (!repo) return
                setIsShareExporting(true)
                try {
                  const appSettings = useSettingsStore.getState().settings
                  const { backupExporter } = await import('@/infrastructure/storage/backupExporter')
                  const blob = await backupExporter.exportBackup(repo, appSettings)
                  await onShareBackupFile(blob)
                } finally {
                  setIsShareExporting(false)
                }
              }}
            >
              {isShareExporting ? 'エクスポート中...' : 'バックアップを共有'}
            </ActionButton>
          </SyncRow>
          <HelpText style={{ marginBottom: 0, marginTop: 8 }}>
            AirDrop・LINE
            などでバックアップファイルを直接送信できます。受け取り側は上のバックアップセクションから復元してください。
          </HelpText>
        </SubSection>
      )}
    </Section>
  )
}
