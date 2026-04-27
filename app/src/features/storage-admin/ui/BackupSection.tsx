/**
 * バックアップセクション — export/import/preview
 *
 * @responsibility R:unclassified
 */
import { useState, useCallback, useRef } from 'react'
import type { BackupMeta } from '@/application/hooks/useBackup'
import {
  Section,
  SectionTitle,
  HelpText,
  SubSection,
  StatusRow,
  ActionButton,
  FileInputLabel,
  ImportResultBox,
} from './StorageManagementTab.styles'

interface Props {
  readonly isExporting: boolean
  readonly isImporting: boolean
  readonly onExport: () => void
  readonly onImport: (file: File, overwrite: boolean) => Promise<{ monthsImported: number }>
  readonly onPreview: (file: File) => Promise<BackupMeta | null>
  readonly onImportComplete: () => Promise<void>
}

export function BackupSection({
  isExporting,
  isImporting,
  onExport,
  onImport,
  onPreview,
  onImportComplete,
}: Props) {
  const [preview, setPreview] = useState<BackupMeta | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [overwrite, setOverwrite] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0]
      if (!f) return
      setFile(f)
      const meta = await onPreview(f)
      setPreview(meta)
      if (inputRef.current) inputRef.current.value = ''
    },
    [onPreview],
  )

  const handleImport = useCallback(async () => {
    if (!file) return
    const result = await onImport(file, overwrite)
    setFile(null)
    setPreview(null)
    await onImportComplete()
    if (result.monthsImported > 0) {
      window.location.reload()
    }
  }, [file, overwrite, onImport, onImportComplete])

  return (
    <Section>
      <SectionTitle>バックアップ</SectionTitle>
      <HelpText>
        全月データ・設定・履歴を JSON ファイルとしてダウンロード、または復元できます（gzip
        圧縮対応）。
      </HelpText>
      <SubSection>
        <StatusRow>
          <ActionButton $variant="primary" onClick={onExport} disabled={isExporting}>
            {isExporting ? 'エクスポート中...' : 'バックアップをダウンロード'}
          </ActionButton>
          <FileInputLabel>
            バックアップから復元
            <input
              ref={inputRef}
              type="file"
              accept=".json,.json.gz,.gz"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </FileInputLabel>
        </StatusRow>
        {preview && (
          <SubSection>
            <ImportResultBox $hasErrors={false}>
              <div>作成日時: {new Date(preview.createdAt).toLocaleString('ja-JP')}</div>
              <div>月数: {preview.months.length} 月分</div>
              <div>対象: {preview.months.map((m) => `${m.year}年${m.month}月`).join(', ')}</div>
              <div>
                フォーマット: v{preview.formatVersion}
                {preview.checksum ? ' (チェックサム付き)' : ''}
              </div>
            </ImportResultBox>
            <StatusRow>
              <label
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
              >
                <input
                  type="checkbox"
                  checked={overwrite}
                  onChange={(e) => setOverwrite(e.target.checked)}
                />
                既存データを上書きする
              </label>
            </StatusRow>
            <StatusRow>
              <ActionButton $variant="primary" onClick={handleImport} disabled={isImporting}>
                {isImporting ? 'インポート中...' : 'このバックアップを復元する'}
              </ActionButton>
              <ActionButton
                onClick={() => {
                  setPreview(null)
                  setFile(null)
                }}
              >
                キャンセル
              </ActionButton>
            </StatusRow>
          </SubSection>
        )}
      </SubSection>
    </Section>
  )
}
