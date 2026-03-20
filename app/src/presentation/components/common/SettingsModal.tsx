import { useState, useCallback } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import type { AppSettings } from '@/domain/models/storeTypes'
import type { AutoBackupState, AutoBackupActions } from '@/application/hooks/useAutoBackup'
import type { AutoImportState, AutoImportActions } from '@/application/hooks/useAutoImport'
import {
  Field,
  Label,
  Input,
  Hint,
  SectionTitle,
  FolderSyncRow,
  FolderName,
  FolderStatus,
  FolderSmallBtn,
  DiagnosticBox,
} from './SettingsModal.styles'

function FolderSyncDiagnostic() {
  const isSecure = typeof window !== 'undefined' && window.isSecureContext
  const hasApi = typeof window !== 'undefined' && 'showDirectoryPicker' in window
  const inIframe = typeof window !== 'undefined' && window.self !== window.top

  return (
    <DiagnosticBox>
      <span>File System Access API を利用できません</span>
      {!isSecure && <span>- HTTPS または localhost でアクセスしてください</span>}
      {isSecure && !hasApi && (
        <span>- Chrome / Edge 86 以上が必要です（Firefox / Safari は非対応）</span>
      )}
      {inIframe && <span>- iframe 内では利用できません</span>}
      {isSecure && hasApi && !inIframe && (
        <span>- ブラウザのセキュリティポリシーで制限されています</span>
      )}
    </DiagnosticBox>
  )
}

interface Props {
  settings: AppSettings
  onSave: (settings: Partial<AppSettings>) => void
  onClose: () => void
  autoBackup?: AutoBackupState & AutoBackupActions
  autoImport?: AutoImportState & AutoImportActions
  showToast?: (message: string, variant: 'success' | 'error' | 'info') => void
}

export function SettingsModal({
  settings,
  onSave,
  onClose,
  autoBackup,
  autoImport,
  showToast,
}: Props) {
  const [values, setValues] = useState({
    targetGrossProfitRate: (settings.targetGrossProfitRate * 100).toString(),
    warningThreshold: (settings.warningThreshold * 100).toString(),
    flowerCostRate: (settings.flowerCostRate * 100).toString(),
    directProduceCostRate: (settings.directProduceCostRate * 100).toString(),
    // コンディションサマリー閾値（粗利率のみ。売変率は閾値設定と共通）
    gpDiffBlueThreshold: settings.gpDiffBlueThreshold.toString(),
    gpDiffYellowThreshold: settings.gpDiffYellowThreshold.toString(),
    gpDiffRedThreshold: settings.gpDiffRedThreshold.toString(),
  })

  const handleChange = useCallback((key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleSave = useCallback(() => {
    onSave({
      targetGrossProfitRate: parseFloat(values.targetGrossProfitRate) / 100,
      warningThreshold: parseFloat(values.warningThreshold) / 100,
      flowerCostRate: parseFloat(values.flowerCostRate) / 100,
      directProduceCostRate: parseFloat(values.directProduceCostRate) / 100,
      gpDiffBlueThreshold: parseFloat(values.gpDiffBlueThreshold),
      gpDiffYellowThreshold: parseFloat(values.gpDiffYellowThreshold),
      gpDiffRedThreshold: parseFloat(values.gpDiffRedThreshold),
    })
    onClose()
  }, [values, onSave, onClose])

  const basicFields = [
    { key: 'targetGrossProfitRate', label: '目標粗利率 (%)', hint: 'デフォルト: 25%' },
    { key: 'warningThreshold', label: '警告しきい値 (%)', hint: 'デフォルト: 23%' },
    { key: 'flowerCostRate', label: '花掛け率 (%)', hint: 'デフォルト: 80%' },
    { key: 'directProduceCostRate', label: '産直掛け率 (%)', hint: 'デフォルト: 85%' },
  ] as const

  const gpThresholdFields = [
    {
      key: 'gpDiffBlueThreshold',
      label: '良好 (pt)',
      hint: '予算比 +N pt 以上で青。デフォルト: 0.20',
    },
    {
      key: 'gpDiffYellowThreshold',
      label: '注意 (pt)',
      hint: '予算比 -N pt 以上で黄色。デフォルト: -0.20',
    },
    {
      key: 'gpDiffRedThreshold',
      label: '警告 (pt)',
      hint: '予算比 -N pt 以上で赤。デフォルト: -0.50',
    },
  ] as const

  return (
    <Modal
      title="アプリケーション設定"
      onClose={onClose}
      footer={
        <>
          <Button $variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button $variant="primary" onClick={handleSave}>
            保存
          </Button>
        </>
      }
    >
      {basicFields.map(({ key, label, hint }) => (
        <Field key={key}>
          <Label>{label}</Label>
          <Input
            type="number"
            step="any"
            value={values[key]}
            onChange={(e) => handleChange(key, e.target.value)}
          />
          <Hint>{hint}</Hint>
        </Field>
      ))}

      <SectionTitle>コンディションサマリー — 粗利率閾値</SectionTitle>
      {gpThresholdFields.map(({ key, label, hint }) => (
        <Field key={key}>
          <Label>{label}</Label>
          <Input
            type="number"
            step="any"
            value={values[key]}
            onChange={(e) => handleChange(key, e.target.value)}
          />
          <Hint>{hint}</Hint>
        </Field>
      ))}

      {autoBackup && (
        <>
          <SectionTitle>フォルダ連携</SectionTitle>
          {autoBackup.supported ? (
            <>
              <Label>自動バックアップ</Label>
              <FolderSyncRow>
                <FolderStatus $ok={autoBackup.folderConfigured}>
                  {autoBackup.folderConfigured ? 'ON' : 'OFF'}
                </FolderStatus>
                {autoBackup.folderConfigured ? (
                  <>
                    <FolderName title={autoBackup.folderName ?? undefined}>
                      {autoBackup.folderName}
                    </FolderName>
                    <FolderSmallBtn
                      onClick={() => {
                        autoBackup.backupNow().then((f) => {
                          if (f) showToast?.(`バックアップ: ${f}`, 'success')
                        })
                      }}
                      disabled={autoBackup.isBacking}
                    >
                      {autoBackup.isBacking ? '...' : '保存'}
                    </FolderSmallBtn>
                    <FolderSmallBtn onClick={() => autoBackup.clearFolder()}>解除</FolderSmallBtn>
                  </>
                ) : (
                  <FolderSmallBtn onClick={() => autoBackup.selectFolder()}>
                    バックアップ先を選択
                  </FolderSmallBtn>
                )}
              </FolderSyncRow>
              {autoBackup.lastBackupAt && (
                <FolderStatus $ok>
                  最終: {new Date(autoBackup.lastBackupAt).toLocaleTimeString()}
                </FolderStatus>
              )}
              {autoBackup.error && <FolderStatus $ok={false}>{autoBackup.error}</FolderStatus>}

              {autoImport && (
                <>
                  <Label style={{ marginTop: '12px' }}>自動インポート</Label>
                  <FolderSyncRow>
                    <FolderStatus $ok={autoImport.folderConfigured}>
                      {autoImport.folderConfigured ? 'ON' : 'OFF'}
                    </FolderStatus>
                    {autoImport.folderConfigured ? (
                      <>
                        <FolderName title={autoImport.folderName ?? undefined}>
                          {autoImport.folderName}
                        </FolderName>
                        <FolderSmallBtn
                          onClick={() => {
                            autoImport.scanNow().then((files) => {
                              if (files.length > 0) {
                                showToast?.(`${files.length}件取込`, 'success')
                              } else {
                                showToast?.('新規ファイルなし', 'info')
                              }
                            })
                          }}
                          disabled={autoImport.isScanning}
                        >
                          {autoImport.isScanning ? '...' : 'スキャン'}
                        </FolderSmallBtn>
                        <FolderSmallBtn onClick={() => autoImport.clearFolder()}>
                          解除
                        </FolderSmallBtn>
                      </>
                    ) : (
                      <FolderSmallBtn onClick={() => autoImport.selectFolder()}>
                        取込元を選択
                      </FolderSmallBtn>
                    )}
                  </FolderSyncRow>
                  {autoImport.folderConfigured && (
                    <FolderSyncRow>
                      <FolderSmallBtn
                        onClick={() => autoImport.setAutoSync(!autoImport.autoSyncEnabled)}
                        style={{
                          background: autoImport.autoSyncEnabled ? '#22c55e20' : undefined,
                          borderColor: autoImport.autoSyncEnabled ? '#22c55e60' : undefined,
                        }}
                      >
                        {autoImport.autoSyncEnabled ? '自動同期 ON' : '自動同期 OFF'}
                      </FolderSmallBtn>
                      {autoImport.autoSyncEnabled && <FolderStatus $ok>5分間隔</FolderStatus>}
                    </FolderSyncRow>
                  )}
                  {autoImport.lastScanAt && (
                    <FolderStatus $ok={autoImport.lastImportCount > 0}>
                      最終スキャン: {new Date(autoImport.lastScanAt).toLocaleTimeString()} (
                      {autoImport.lastImportCount}件)
                    </FolderStatus>
                  )}
                  {autoImport.error && <FolderStatus $ok={false}>{autoImport.error}</FolderStatus>}
                </>
              )}
            </>
          ) : (
            <FolderSyncDiagnostic />
          )}
        </>
      )}
    </Modal>
  )
}
