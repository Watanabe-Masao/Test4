import { useState, useCallback } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import type { AppSettings } from '@/domain/models'
import type { AutoBackupState, AutoBackupActions } from '@/application/hooks/useAutoBackup'
import type { AutoImportState, AutoImportActions } from '@/application/hooks/useAutoImport'
import styled from 'styled-components'

const Field = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing[6]};
`

const Label = styled.label`
  display: block;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-weight: ${({ theme }) => theme.typography.fontWeight.semibold};
  color: ${({ theme }) => theme.colors.text2};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

const Input = styled.input`
  width: 100%;
  padding: ${({ theme }) => theme.spacing[3]} ${({ theme }) => theme.spacing[4]};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bg3};
  color: ${({ theme }) => theme.colors.text};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colors.palette.primary};
  }
`

const Hint = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text4};
  margin-top: ${({ theme }) => theme.spacing[1]};
`

const SectionTitle = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  color: ${({ theme }) => theme.colors.text};
  margin-top: ${({ theme }) => theme.spacing[6]};
  margin-bottom: ${({ theme }) => theme.spacing[4]};
  padding-bottom: ${({ theme }) => theme.spacing[2]};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`

// ─── フォルダ連携 styled ──────────────────────────────
const FolderSyncRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing[2]};
  margin-bottom: ${({ theme }) => theme.spacing[2]};
`

const FolderName = styled.span`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  color: ${({ theme }) => theme.colors.text2};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`

const FolderStatus = styled.span<{ $ok: boolean }>`
  font-size: 0.6rem;
  color: ${({ theme, $ok }) => ($ok ? theme.colors.palette.success : theme.colors.text4)};
`

const FolderSmallBtn = styled.button`
  all: unset;
  cursor: pointer;
  font-size: 0.6rem;
  padding: 2px 6px;
  border-radius: ${({ theme }) => theme.radii.sm};
  color: ${({ theme }) => theme.colors.text4};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  &:hover {
    color: ${({ theme }) => theme.colors.text3};
    background: ${({ theme }) =>
      theme.mode === 'dark' ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)'};
  }
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.palette.primary};
    outline-offset: 2px;
  }
`

const DiagnosticBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: ${({ theme }) => theme.spacing[2]} ${({ theme }) => theme.spacing[3]};
  background: ${({ theme }) => theme.colors.bg2};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: 0.6rem;
  color: ${({ theme }) => theme.colors.text4};
`

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
    // コンディションサマリー閾値
    gpDiffBlueThreshold: settings.gpDiffBlueThreshold.toString(),
    gpDiffYellowThreshold: settings.gpDiffYellowThreshold.toString(),
    gpDiffRedThreshold: settings.gpDiffRedThreshold.toString(),
    discountBlueThreshold: (settings.discountBlueThreshold * 100).toString(),
    discountYellowThreshold: (settings.discountYellowThreshold * 100).toString(),
    discountRedThreshold: (settings.discountRedThreshold * 100).toString(),
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
      discountBlueThreshold: parseFloat(values.discountBlueThreshold) / 100,
      discountYellowThreshold: parseFloat(values.discountYellowThreshold) / 100,
      discountRedThreshold: parseFloat(values.discountRedThreshold) / 100,
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

  const discountThresholdFields = [
    { key: 'discountBlueThreshold', label: '良好 (%)', hint: 'N% 以下で青。デフォルト: 2.0' },
    { key: 'discountYellowThreshold', label: '注意 (%)', hint: 'N% 以下で黄色。デフォルト: 2.5' },
    { key: 'discountRedThreshold', label: '警告 (%)', hint: 'N% 以下で赤。デフォルト: 3.0' },
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

      <SectionTitle>コンディションサマリー — 売変率閾値</SectionTitle>
      {discountThresholdFields.map(({ key, label, hint }) => (
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
