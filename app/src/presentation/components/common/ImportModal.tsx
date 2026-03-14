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
import type { DataType } from '@/domain/models'
import type { ImportSummary } from '@/application/usecases/import'
import type { ImportStage } from './ImportWizard'
import { useImport, useStoreSelection } from '@/application/hooks'
import { useToast } from './useToast'
import { useDataSummary } from '@/application/hooks/useDataSummary'
import { useDataStore } from '@/application/stores/dataStore'

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
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
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

interface ImportModalProps {
  readonly onClose: () => void
}

export function ImportModal({ onClose }: ImportModalProps) {
  const data = useDataStore((s) => s.data)
  const { importFiles, progress } = useImport()
  const showToast = useToast()
  const { loadedTypes, maxDayByType } = useDataSummary(data)
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
        {importStage !== 'idle' && (
          <ImportProgressSteps progress={progress} stage={importStage} />
        )}
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
    </Modal>
  )
}
