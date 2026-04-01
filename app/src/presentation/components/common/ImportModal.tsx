/**
 * ImportModal — ファイル取込モーダル
 *
 * サイドバーのインポートボタンから開く。
 * FileDropZone + UploadCard + ImportProgress をモーダル内に配置。
 */
import { useCallback, useState, useMemo } from 'react'
import { Modal } from './Modal'
import { FileDropZone } from './FileDropZone'
import { UploadCard } from './UploadCard'
import { ImportProgress as ImportProgressSteps } from './ImportWizard'
import { ImportProgressBar } from './ImportProgressBar'
import { ImportSummaryCard } from './ImportWizard'
import styled from 'styled-components'
import type { DataType } from '@/domain/models/storeTypes'
import type { ImportSummary } from '@/domain/models/ImportResult'
import type { ImportStage } from './ImportWizard'
import { useImport } from '@/application/hooks/data'
import type { AutoBackupState, AutoBackupActions } from '@/application/hooks/data'
import type { AutoImportState, AutoImportActions } from '@/application/hooks/data'
import { useStoreSelection } from '@/application/hooks/ui'
import { useToast } from './useToast'
import { useDataSummary } from '@/application/hooks/useDataSummary'

const uploadTypes: { type: DataType; label: string; multi?: boolean }[] = [
  { type: 'budget', label: '0_売上予算' },
  { type: 'classifiedSales', label: '1_分類別売上', multi: true },
  { type: 'flowers', label: '2_売上納品_花' },
  { type: 'directProduce', label: '3_売上納品_産直' },
  { type: 'interStoreOut', label: '4_店間出' },
  { type: 'interStoreIn', label: '5_店間入' },
  { type: 'purchase', label: '6_仕入' },
  { type: 'categoryTimeSales', label: '7.分類別時間帯売上', multi: true },
  { type: 'consumables', label: '8.原価算入費', multi: true },
  { type: 'initialSettings', label: '999_初期設定' },
]

const UploadGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
`

const PrivacyInfoBox = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text4};
  margin-top: 8px;
`

const PrivacyDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.palette.positive};
  flex-shrink: 0;
`

const Section = styled.div`
  margin-bottom: 16px;
`

const FolderSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
`

const FolderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const FolderDot = styled.span<{ $active: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $active, theme }) =>
    $active ? theme.colors.palette.positive : theme.colors.text4};
  flex-shrink: 0;
`

const FolderBtn = styled.button`
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  padding: 2px 8px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.sm};
  background: transparent;
  color: ${({ theme }) => theme.colors.text2};
  cursor: pointer;
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => theme.colors.bg4};
  }
`

const FolderName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  color: ${({ theme }) => theme.colors.text3};
`

interface ImportModalProps {
  readonly onClose: () => void
  readonly autoBackup?: AutoBackupState & AutoBackupActions
  readonly autoImport?: AutoImportState & AutoImportActions
}

export function ImportModal({ onClose, autoBackup, autoImport }: ImportModalProps) {
  const { importFiles, progress } = useImport()
  const showToast = useToast()
  const { loadedTypes, maxDayByType } = useDataSummary()
  useStoreSelection() // keep store selection reactive

  const [importStage, setImportStage] = useState<ImportStage>('idle')
  const [lastSummary, setLastSummary] = useState<ImportSummary | null>(null)

  const handleFiles = useCallback(
    async (files: FileList | File[], overrideType?: DataType) => {
      setImportStage('reading')
      setLastSummary(null)
      try {
        const summary = await importFiles(files, overrideType)
        setImportStage('validating')

        summary.results.forEach((r) => {
          if (r.ok) {
            showToast(`${r.typeName}: ${r.filename}`, 'success')
          } else {
            showToast(`${r.filename}: ${r.error}`, 'error')
          }
        })

        setImportStage('saving')
        await new Promise((r) => setTimeout(r, 300))
        setImportStage('done')
        setLastSummary(summary)

        setTimeout(() => setImportStage('idle'), 3000)
      } catch {
        setImportStage('idle')
      }
    },
    [importFiles, showToast],
  )

  const handleSingleFile = useCallback(
    async (files: File | File[], typeHint: DataType) => {
      const fileArray = Array.isArray(files) ? files : [files]
      await handleFiles(fileArray, typeHint)
    },
    [handleFiles],
  )

  // Memoize to avoid re-render
  const loadedTypesStable = useMemo(() => loadedTypes, [loadedTypes])

  return (
    <Modal title="ファイル取込" onClose={onClose}>
      <Section>
        <FileDropZone onFiles={handleFiles} />
        {importStage !== 'idle' && <ImportProgressSteps progress={progress} stage={importStage} />}
        {importStage === 'idle' && progress && <ImportProgressBar progress={progress} />}
        {lastSummary && importStage === 'idle' && (
          <ImportSummaryCard summary={lastSummary} onDismiss={() => setLastSummary(null)} />
        )}
      </Section>

      <Section>
        <UploadGrid>
          {uploadTypes.map(({ type, label, multi }) => (
            <UploadCard
              key={type}
              dataType={type}
              label={label}
              loaded={loadedTypesStable.has(type)}
              maxDay={maxDayByType.get(type)}
              onFile={handleSingleFile}
              multiple={multi}
            />
          ))}
        </UploadGrid>
        <PrivacyInfoBox>
          <PrivacyDot />
          ローカル保存 | サーバー送信なし
        </PrivacyInfoBox>
      </Section>

      {(autoBackup?.supported || autoImport?.supported) && (
        <FolderSection>
          <strong style={{ fontSize: '0.75rem' }}>フォルダ同期</strong>
          {autoBackup?.supported && (
            <FolderRow>
              <FolderDot $active={autoBackup.folderConfigured} />
              {autoBackup.folderConfigured ? (
                <>
                  <FolderName title={autoBackup.folderName ?? undefined}>
                    バックアップ: {autoBackup.folderName}
                  </FolderName>
                  <FolderBtn onClick={() => autoBackup.backupNow()}>保存</FolderBtn>
                </>
              ) : (
                <FolderBtn onClick={() => autoBackup.selectFolder()}>
                  バックアップ先を選択
                </FolderBtn>
              )}
            </FolderRow>
          )}
          {autoImport?.supported && (
            <FolderRow>
              <FolderDot $active={autoImport.folderConfigured} />
              {autoImport.folderConfigured ? (
                <>
                  <FolderName title={autoImport.folderName ?? undefined}>
                    自動取込: {autoImport.folderName}
                  </FolderName>
                  <FolderBtn onClick={() => autoImport.scanNow()}>スキャン</FolderBtn>
                </>
              ) : (
                <FolderBtn onClick={() => autoImport.selectFolder()}>取込元を選択</FolderBtn>
              )}
            </FolderRow>
          )}
        </FolderSection>
      )}
    </Modal>
  )
}
