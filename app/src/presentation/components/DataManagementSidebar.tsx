import { useCallback, useMemo, useState } from 'react'
import { useDataStore } from '@/application/stores/dataStore'
import { useUiStore } from '@/application/stores/uiStore'
import { calculationCache } from '@/application/services/calculationCache'
import { useImport, useAutoBackup, useAutoImport } from '@/application/hooks/data'
import { useStoreSelection, useSettings } from '@/application/hooks/ui'
import { useRepository } from '@/application/context/useRepository'
import { Sidebar } from '@/presentation/components/Layout'
import {
  useToast,
  SettingsModal,
  ValidationModal,
  DiffConfirmModal,
  ImportModal,
  OnlineStatusChip,
} from '@/presentation/components/common/feedback'
import { Chip, ChipGroup } from '@/presentation/components/common/forms'
import { Button } from '@/presentation/components/common/layout'
import type { DiffConfirmResult } from '@/presentation/components/common/feedback'
import { getDaysInMonth } from '@/domain/constants/defaults'
import { detectDataMaxDay } from '@/application/services/dataDetection'
import type { InventoryConfig } from '@/domain/models/record'

const EMPTY_SETTINGS: ReadonlyMap<string, InventoryConfig> = new Map()
import {
  SidebarSection,
  SectionLabel,
  SidebarActions,
} from '@/presentation/components/DataManagementSidebar.styles'
import { DataEndDaySlider } from '@/presentation/components/DataEndDaySlider'
import { usePeriodSelectionStore } from '@/application/stores/periodSelectionStore'
import { InventorySettingsSection } from '@/presentation/components/InventorySettingsSection'
import styled from 'styled-components'

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
  const current = useDataStore((s) => s.currentMonthData)
  const storeResultsSize = useDataStore((s) => s.storeResults.size)
  const updateInventory = useDataStore((s) => s.updateInventory)
  const invalidateCalculation = useUiStore((s) => s.invalidateCalculation)
  const handleInventoryUpdate = (
    storeId: string,
    config: Partial<import('@/domain/models/record').InventoryConfig>,
  ) => {
    updateInventory(storeId, config)
    calculationCache.clear()
    invalidateCalculation()
  }
  const { importFiles, validationMessages, pendingDiff, resolveDiff } = useImport()
  const { selectedStoreIds, stores, toggleStore, selectAllStores } = useStoreSelection()
  const { settings, updateSettings } = useSettings()
  const showToast = useToast()
  const repo = useRepository()

  // 自動バックアップ
  const backupTrigger = useMemo(
    () =>
      `${current?.stores.size ?? 0}:${current?.budget.size ?? 0}:${current?.settings.size ?? 0}:${current?.classifiedSales.records.length ?? 0}`,
    [current],
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

  const [showSettings, setShowSettings] = useState(false)
  const [showValidation, setShowValidation] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

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
  const detectedMaxDay = useMemo(() => (current ? detectDataMaxDay(current) : 0), [current])
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
      autoImport
        .scanNow()
        .then(() => showToast('フォルダを再スキャンしています...', 'info'))
        .catch(() => showToast('再スキャンに失敗しました', 'error'))
    }
  }, [autoImport, showToast])

  return (
    <>
      <Sidebar title="データ管理">
        {/* オンライン/オフラインステータス + インポートボタン  * @responsibility R:form
         */}
        <SidebarSection>
          <TopRow>
            <OnlineStatusChip
              onLongPress={handleLongPress}
              hasData={hasNonBudgetData}
              isCalculated={storeResultsSize > 0}
            />
            <Button $variant="primary" onClick={() => setShowImportModal(true)}>
              取込
            </Button>
          </TopRow>
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
                  title={s.name}
                >
                  {s.code}
                </Chip>
              ))}
            </ChipGroup>
          </SidebarSection>
        )}

        {stores.size > 0 && (
          <InventorySettingsSection
            stores={stores}
            settings={settings}
            settingsMap={current?.settings ?? EMPTY_SETTINGS}
            onInventoryUpdate={handleInventoryUpdate}
          />
        )}

        {/* フォルダ同期は取込モーダルに移動済み */}

        <SidebarSection>
          <SidebarActions>
            <Button $variant="outline" onClick={() => setShowSettings(true)}>
              設定
            </Button>
          </SidebarActions>
        </SidebarSection>
      </Sidebar>

      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          autoBackup={autoBackup}
          autoImport={autoImport}
        />
      )}

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
