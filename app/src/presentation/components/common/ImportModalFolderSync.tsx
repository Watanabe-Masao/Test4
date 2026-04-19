/**
 * ImportModalFolderSync — ファイル取込モーダルのフォルダ同期サブセクション
 *
 * バックアップ先 / 自動取込元 の管理 UI を分離。
 * 解除 / スキャン / 全再スキャン をここに集約する。
 *
 * @responsibility R:form
 */
import styled from 'styled-components'
import type { AutoBackupState, AutoBackupActions } from '@/application/hooks/data'
import type { AutoImportState, AutoImportActions } from '@/application/hooks/data'

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

const FolderDangerBtn = styled(FolderBtn)`
  color: ${({ theme }) => theme.colors.palette.negative};
`

const FolderName = styled.span`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  color: ${({ theme }) => theme.colors.text3};
`

const FolderMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: ${({ theme }) => theme.typography.fontSize.micro};
  color: ${({ theme }) => theme.colors.text4};
  padding-left: 14px;
`

interface Props {
  readonly autoBackup?: AutoBackupState & AutoBackupActions
  readonly autoImport?: AutoImportState & AutoImportActions
}

export function ImportModalFolderSync({ autoBackup, autoImport }: Props) {
  if (!autoBackup?.supported && !autoImport?.supported) return null

  return (
    <FolderSection>
      <strong style={{ fontSize: '0.75rem' }}>フォルダ同期</strong>
      {autoBackup?.supported && <BackupRow autoBackup={autoBackup} />}
      {autoImport?.supported && <ImportRow autoImport={autoImport} />}
    </FolderSection>
  )
}

function BackupRow({ autoBackup }: { autoBackup: AutoBackupState & AutoBackupActions }) {
  return (
    <FolderRow>
      <FolderDot $active={autoBackup.folderConfigured} />
      {autoBackup.folderConfigured ? (
        <>
          <FolderName title={autoBackup.folderName ?? undefined}>
            バックアップ: {autoBackup.folderName}
          </FolderName>
          <FolderBtn onClick={() => autoBackup.backupNow()} disabled={autoBackup.isBacking}>
            {autoBackup.isBacking ? '...' : '保存'}
          </FolderBtn>
          <FolderDangerBtn
            onClick={() => {
              if (window.confirm('バックアップ先の設定を解除しますか？')) {
                autoBackup.clearFolder()
              }
            }}
          >
            解除
          </FolderDangerBtn>
        </>
      ) : (
        <FolderBtn onClick={() => autoBackup.selectFolder()}>バックアップ先を選択</FolderBtn>
      )}
    </FolderRow>
  )
}

function ImportRow({ autoImport }: { autoImport: AutoImportState & AutoImportActions }) {
  return (
    <>
      <FolderRow>
        <FolderDot $active={autoImport.folderConfigured} />
        {autoImport.folderConfigured ? (
          <>
            <FolderName title={autoImport.folderName ?? undefined}>
              自動取込: {autoImport.folderName}
            </FolderName>
            <FolderBtn onClick={() => autoImport.scanNow()} disabled={autoImport.isScanning}>
              {autoImport.isScanning ? '...' : 'スキャン'}
            </FolderBtn>
            <FolderBtn
              onClick={() => {
                if (
                  window.confirm(
                    '処理済み指紋をクリアしてフォルダ内の全ファイルを再取込しますか？',
                  )
                ) {
                  autoImport.rescanAll()
                }
              }}
              disabled={autoImport.isScanning}
              title="処理済み指紋を忘れて全ファイルを再取込"
            >
              全再スキャン
            </FolderBtn>
            <FolderDangerBtn
              onClick={() => {
                if (window.confirm('自動取込の設定を解除しますか？')) {
                  autoImport.clearFolder()
                }
              }}
            >
              解除
            </FolderDangerBtn>
          </>
        ) : (
          <FolderBtn onClick={() => autoImport.selectFolder()}>取込元を選択</FolderBtn>
        )}
      </FolderRow>
      {autoImport.folderConfigured && (autoImport.lastScanAt || autoImport.error) && (
        <FolderMeta>
          {autoImport.error ? (
            <span>エラー: {autoImport.error}</span>
          ) : (
            <>
              <span>
                最終{' '}
                {autoImport.lastScanAt
                  ? new Date(autoImport.lastScanAt).toLocaleTimeString()
                  : '-'}
              </span>
              <span>取込 {autoImport.lastImportCount}</span>
              <span>既処理 {autoImport.processedCount}</span>
            </>
          )}
        </FolderMeta>
      )}
    </>
  )
}
