import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import {
  useImport,
  useStoreSelection,
  useSettings,
  useStorageAdmin,
  useAutoBackup,
  useAutoImport,
} from '@/application/hooks'
import { useRepository } from '@/application/context/useRepository'
import { Sidebar } from '@/presentation/components/Layout'
import {
  Button,
  Chip,
  ChipGroup,
  useToast,
  SettingsModal,
  ValidationModal,
  MonthSelector,
  DiffConfirmModal,
  ImportModal,
  OnlineStatusChip,
} from '@/presentation/components/common'
import type { DiffConfirmResult } from '@/presentation/components/common'
import { getDaysInMonth } from '@/domain/constants/defaults'
import { detectDataMaxDay } from '@/domain/calculations/utils'
import {
  SidebarSection,
  SectionLabel,
  SidebarActions,
} from '@/presentation/components/DataManagementSidebar.styles'
import { DataEndDaySlider } from '@/presentation/components/DataEndDaySlider'
import { usePeriodSelectionStore } from '@/application/stores/periodSelectionStore'
import { InventorySettingsSection } from '@/presentation/components/InventorySettingsSection'
import styled from 'styled-components'

const FolderSyncStatus = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.text3};
`

const FolderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`

const FolderDot = styled.span<{ $active: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $active, theme }) => ($active ? theme.positive : theme.text4)};
  flex-shrink: 0;
`

const FolderName = styled.span`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.text2};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
`

const SmallBtn = styled.button`
  all: unset;
  cursor: pointer;
  font-size: ${({ theme }) => theme.fontSize.xs};
  padding: 1px 6px;
  border-radius: 4px;
  color: ${({ theme }) => theme.text4};
  background: ${({ theme }) =>
    theme.mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'};
  &:hover {
    color: ${({ theme }) => theme.text2};
  }
`

const TopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
`

export function DataManagementSidebar({
  showSettingsExternal,
  onSettingsExternalClose,
}: {
  showSettingsExternal?: boolean
  onSettingsExternalClose?: () => void
} = {}) {
  const data = useDataStore((s) => s.data)
  const { importFiles, validationMessages, pendingDiff, resolveDiff } = useImport()
  const { selectedStoreIds, stores, toggleStore, selectAllStores } = useStoreSelection()
  const { settings, updateSettings } = useSettings()
  const showToast = useToast()
  const { listMonths } = useStorageAdmin()
  const repo = useRepository()

  // 自動バックアップ
  const backupTrigger = useMemo(
    () =>
      `${data.stores.size}:${data.budget.size}:${data.settings.size}:${data.classifiedSales.records.length}`,
    [data.stores.size, data.budget.size, data.settings.size, data.classifiedSales.records.length],
  )
  const autoBackup = useAutoBackup(repo, backupTrigger)

  // 自動インポート
  const handleAutoImportFiles = useCallback(
    async (files: File[]) => {
      await importFiles(files)
    },
    [importFiles],
  )
  const autoImport = useAutoImport(handleAutoImportFiles)

  const [storedMonths, setStoredMonths] = useState<readonly { year: number; month: number }[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [showValidation, setShowValidation] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  // 保存済み月リストを取得
  useEffect(() => {
    let cancelled = false
    listMonths()
      .then((months) => {
        if (!cancelled) setStoredMonths(months)
      })
      .catch((err: unknown) => {
        console.warn('保存済み月リストの取得に失敗:', err)
      })
    return () => {
      cancelled = true
    }
  }, [listMonths, data])

  const isSettingsOpen = showSettings || showSettingsExternal
  const closeSettings = useCallback(() => {
    setShowSettings(false)
    onSettingsExternalClose?.()
  }, [onSettingsExternalClose])

  const handleDiffConfirm = useCallback(
    (result: DiffConfirmResult) => {
      resolveDiff(result.action)
      if (result.action !== 'cancel') {
        showToast(
          result.action === 'overwrite'
            ? '新規データで上書きしました'
            : '既存データを維持し、新規分のみ追加しました',
          'success',
        )
        setShowValidation(true)
      } else {
        showToast('インポートをキャンセルしました', 'info')
      }
    },
    [resolveDiff, showToast],
  )

  const daysInMonth = getDaysInMonth(settings.targetYear, settings.targetMonth)
  const detectedMaxDay = useMemo(() => detectDataMaxDay(data), [data])
  const hasNonBudgetData = detectedMaxDay > 0

  // 期間選択ストアへの双方向同期
  const setPeriod1 = usePeriodSelectionStore((s) => s.setPeriod1)
  const period1 = usePeriodSelectionStore((s) => s.selection.period1)
  const handlePeriodEndDayChange = useCallback(
    (endDay: number) => {
      setPeriod1({ ...period1, to: { ...period1.to, day: endDay } })
    },
    [setPeriod1, period1],
  )

  // 長押しでデータ再スキャン
  const handleLongPress = useCallback(() => {
    if (autoImport.folderConfigured) {
      autoImport.scanNow().catch(() => {})
      showToast('フォルダを再スキャンしています...', 'info')
    }
  }, [autoImport, showToast])

  return (
    <>
      <Sidebar title="データ管理">
        {/* オンライン/オフラインステータス + インポートボタン */}
        <SidebarSection>
          <TopRow>
            <OnlineStatusChip onLongPress={handleLongPress} />
            <Button $variant="primary" onClick={() => setShowImportModal(true)}>
              取込
            </Button>
          </TopRow>
        </SidebarSection>

        <SidebarSection>
          <SectionLabel>対象年月</SectionLabel>
          <MonthSelector storedMonths={storedMonths} />
        </SidebarSection>

        {hasNonBudgetData && (
          <DataEndDaySlider
            daysInMonth={daysInMonth}
            detectedMaxDay={detectedMaxDay}
            settings={settings}
            updateSettings={updateSettings}
            onPeriodEndDayChange={handlePeriodEndDayChange}
          />
        )}

        {stores.size > 0 && (
          <SidebarSection>
            <SectionLabel>店舗選択（複数可）</SectionLabel>
            <ChipGroup>
              <Chip $active={selectedStoreIds.size === 0} onClick={selectAllStores}>
                全店
              </Chip>
              {Array.from(stores.values()).map((s) => (
                <Chip
                  key={s.id}
                  $active={selectedStoreIds.has(s.id)}
                  onClick={() => toggleStore(s.id)}
                >
                  {s.name}
                </Chip>
              ))}
            </ChipGroup>
          </SidebarSection>
        )}

        {stores.size > 0 && (
          <InventorySettingsSection
            stores={stores}
            settings={settings}
            settingsMap={data.settings}
          />
        )}

        {/* フォルダ同期ステータス */}
        {(autoBackup.supported || autoImport.supported) && (
          <SidebarSection>
            <SectionLabel>フォルダ同期</SectionLabel>
            <FolderSyncStatus>
              {autoBackup.supported && (
                <FolderRow>
                  <FolderDot $active={autoBackup.folderConfigured} />
                  {autoBackup.folderConfigured ? (
                    <>
                      <FolderName title={autoBackup.folderName ?? undefined}>
                        バックアップ: {autoBackup.folderName}
                      </FolderName>
                      <SmallBtn onClick={() => autoBackup.backupNow()}>保存</SmallBtn>
                    </>
                  ) : (
                    <SmallBtn onClick={() => autoBackup.selectFolder()}>
                      バックアップ先を選択
                    </SmallBtn>
                  )}
                </FolderRow>
              )}
              {autoImport.supported && (
                <FolderRow>
                  <FolderDot $active={autoImport.folderConfigured} />
                  {autoImport.folderConfigured ? (
                    <>
                      <FolderName title={autoImport.folderName ?? undefined}>
                        自動取込: {autoImport.folderName}
                      </FolderName>
                      <SmallBtn onClick={() => autoImport.scanNow()}>スキャン</SmallBtn>
                    </>
                  ) : (
                    <SmallBtn onClick={() => autoImport.selectFolder()}>
                      取込元を選択
                    </SmallBtn>
                  )}
                </FolderRow>
              )}
            </FolderSyncStatus>
          </SidebarSection>
        )}

        <SidebarSection>
          <SidebarActions>
            <Button $variant="outline" onClick={() => setShowSettings(true)}>
              設定
            </Button>
          </SidebarActions>
        </SidebarSection>
      </Sidebar>

      {showImportModal && <ImportModal onClose={() => setShowImportModal(false)} />}

      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onSave={updateSettings}
          onClose={closeSettings}
          autoBackup={autoBackup}
          autoImport={autoImport}
          showToast={showToast}
        />
      )}
      {pendingDiff ? (
        <DiffConfirmModal diffResult={pendingDiff.diffResult} onConfirm={handleDiffConfirm} />
      ) : showValidation && validationMessages.length > 0 ? (
        <ValidationModal messages={validationMessages} onClose={() => setShowValidation(false)} />
      ) : null}
    </>
  )
}
